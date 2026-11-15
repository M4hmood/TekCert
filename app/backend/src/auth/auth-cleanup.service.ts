import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, type Repository } from 'typeorm';
import { EmailToken } from './entities/email-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { Session } from './entities/session.entity';

export interface AuthCleanup {
  sessions: number;
  emailTokens: number;
  loginAttempts: number;
}

/**
 * Removes auth rows that can no longer be used. Nothing reads them once they are this old, so
 * deleting them changes no behaviour; it keeps the tables from growing for ever.
 */
@Injectable()
export class AuthCleanupService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(EmailToken) private readonly tokens: Repository<EmailToken>,
    @InjectRepository(LoginAttempt) private readonly attempts: Repository<LoginAttempt>,
  ) {}

  /**
   * - sessions and email links that expired before `expiredBefore`;
   * - failed sign-in counters untouched since `attemptsBefore` whose lockout, if any, is over.
   */
  async deleteExpired(expiredBefore: Date, attemptsBefore: Date): Promise<AuthCleanup> {
    const [sessions, emailTokens, unlocked, locked] = await Promise.all([
      this.sessions.delete({ expiresAt: LessThan(expiredBefore) }),
      this.tokens.delete({ expiresAt: LessThan(expiredBefore) }),
      this.attempts.delete({ lastFailedAt: LessThan(attemptsBefore), lockedUntil: IsNull() }),
      this.attempts.delete({
        lastFailedAt: LessThan(attemptsBefore),
        lockedUntil: LessThan(attemptsBefore),
      }),
    ]);
    return {
      sessions: sessions.affected ?? 0,
      emailTokens: emailTokens.affected ?? 0,
      loginAttempts: (unlocked.affected ?? 0) + (locked.affected ?? 0),
    };
  }
}
