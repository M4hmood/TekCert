import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AUTH_PROBLEM,
  type CurrentUser,
  LOCKOUT_MINUTES,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from '@tekcert/types';
import type { Repository } from 'typeorm';
import { CLOCK, type Clock } from '../common/clock';
import { ProblemException } from '../common/problem.exception';
import type { Env } from '../config/env';
import { User } from '../database/entities';
import { MAIL_SENDER, type MailSender } from '../mail/mail.sender';
import { accountExistsMail, resetPasswordMail, verifyEmailMail } from '../mail/templates';
import type { IssuedSession } from './cookies';
import { EmailTokensService } from './email-tokens.service';
import { LoginAttemptsService } from './login-attempts.service';
import { PasswordService } from './password.service';
import { type DeviceInfo, SessionsService } from './sessions.service';

type SignUp = Required<Pick<SignUpInput, 'profileVisible'>> & Omit<SignUpInput, 'profileVisible'>;
type SignIn = Required<SignInInput>;

const invalidLink = () =>
  new ProblemException({
    type: AUTH_PROBLEM.invalidToken,
    title: 'Invalid or expired link',
    status: HttpStatus.BAD_REQUEST,
    detail: 'This link has expired or was already used. Ask for a new one.',
  });

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly webUrl: string;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly attempts: LoginAttemptsService,
    private readonly emailTokens: EmailTokensService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
    @Inject(CLOCK) private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  /**
   * Same answer whether or not the address is taken, so sign-up never reveals an account.
   * The owner of an existing account gets an email instead.
   */
  async signUp(input: SignUp): Promise<void> {
    // Hash first on every path so response times don't reveal existing accounts either.
    const passwordHash = await this.passwords.hash(input.password);
    const existing = await this.users.findOneBy({ email: input.email });
    if (existing) {
      if (existing.emailVerifiedAt) await this.sendAccountExists(existing);
      else await this.sendVerification(existing);
      return;
    }
    const now = this.clock.now();
    const user = await this.users.save(
      this.users.create({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        profileVisible: input.profileVisible,
        visibilityConsentedAt: input.profileVisible ? now : null,
      }),
    );
    await this.sendVerification(user);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findOneBy({ email });
    if (user && !user.emailVerifiedAt) await this.sendVerification(user);
  }

  /** Confirms the address and signs the student in. */
  async verifyEmail(token: string, device: DeviceInfo): Promise<SessionResult> {
    const userId = await this.emailTokens.consume(token, 'verify_email');
    if (!userId) throw invalidLink();
    await this.users.update({ id: userId }, { emailVerifiedAt: this.clock.now() });
    const user = await this.users.findOneByOrFail({ id: userId });
    return { user: toCurrentUser(user), session: await this.sessions.create(user, false, device) };
  }

  async signIn(input: SignIn, device: DeviceInfo): Promise<SessionResult> {
    const status = await this.attempts.status(input.email);
    if (status.locked) throw lockedProblem(status.retryAfterSeconds);

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: input.email })
      .getOne();
    const valid = await this.passwords.verify(user?.passwordHash, input.password);

    if (!user || !valid) {
      const failure = await this.attempts.recordFailure(input.email);
      if (failure.locked) throw lockedProblem(failure.retryAfterSeconds);
      throw new ProblemException({
        type: AUTH_PROBLEM.invalidCredentials,
        title: 'Incorrect email or password',
        status: HttpStatus.UNAUTHORIZED,
        attemptsLeft: failure.attemptsLeft,
      });
    }

    await this.attempts.reset(input.email);
    if (!user.emailVerifiedAt) {
      throw new ProblemException({
        type: AUTH_PROBLEM.emailNotVerified,
        title: 'Confirm your email first',
        status: HttpStatus.FORBIDDEN,
        detail: 'Open the link we sent to your institute address, or ask for a new one.',
      });
    }
    return {
      user: toCurrentUser(user),
      session: await this.sessions.create(user, input.remember, device),
    };
  }

  /** Always succeeds from the caller's point of view; sends a link only to existing accounts. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOneBy({ email });
    if (!user) return;
    const token = await this.emailTokens.issue(user.id, 'reset_password');
    if (!token) return;
    await this.deliver(
      resetPasswordMail(user.email, {
        firstName: user.firstName,
        url: `${this.webUrl}/reset-password?token=${token}`,
      }),
    );
  }

  /** Sets the new password and signs the account out everywhere. */
  async resetPassword({ token, password }: ResetPasswordInput): Promise<void> {
    const userId = await this.emailTokens.consume(token, 'reset_password');
    if (!userId) throw invalidLink();
    const user = await this.users.findOneByOrFail({ id: userId });
    await this.users.update(
      { id: userId },
      {
        passwordHash: await this.passwords.hash(password),
        // The reset link proves the student owns the mailbox.
        emailVerifiedAt: user.emailVerifiedAt ?? this.clock.now(),
      },
    );
    await this.sessions.revokeAllForUser(userId);
    await this.attempts.reset(user.email);
  }

  async me(userId: string): Promise<CurrentUser> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) {
      throw new ProblemException({
        type: AUTH_PROBLEM.unauthenticated,
        title: 'Sign in required',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    return toCurrentUser(user);
  }

  private async sendVerification(user: User): Promise<void> {
    const token = await this.emailTokens.issue(user.id, 'verify_email');
    if (!token) return;
    await this.deliver(
      verifyEmailMail(user.email, {
        firstName: user.firstName,
        url: `${this.webUrl}/verify-email?token=${token}`,
      }),
    );
  }

  private async sendAccountExists(user: User): Promise<void> {
    // Reuses the reset cooldown so repeated sign-ups can't flood the owner's inbox.
    const token = await this.emailTokens.issue(user.id, 'reset_password');
    if (!token) return;
    await this.deliver(
      accountExistsMail(user.email, {
        firstName: user.firstName,
        signInUrl: `${this.webUrl}/sign-in`,
        resetUrl: `${this.webUrl}/reset-password?token=${token}`,
      }),
    );
  }

  /** Email failures are logged, not surfaced: the student can use "Resend". */
  private async deliver(mail: Parameters<MailSender['send']>[0]): Promise<void> {
    try {
      await this.mail.send(mail);
    } catch (error) {
      this.logger.error({ err: error, subject: mail.subject }, 'Email delivery failed');
    }
  }
}

export interface SessionResult {
  user: CurrentUser;
  session: IssuedSession;
}

function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    profileVisible: user.profileVisible,
  };
}

function lockedProblem(retryAfterSeconds: number): ProblemException {
  return new ProblemException({
    type: AUTH_PROBLEM.locked,
    title: 'Too many attempts',
    status: HttpStatus.TOO_MANY_REQUESTS,
    detail: `Try again in ${LOCKOUT_MINUTES} minutes.`,
    retryAfterSeconds,
  });
}
