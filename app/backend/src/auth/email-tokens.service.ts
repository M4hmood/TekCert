import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RESEND_COOLDOWN_SECONDS } from '@tekcert/types';
import { IsNull, MoreThan, type Repository } from 'typeorm';
import { CLOCK, type Clock } from '../common/clock';
import { EmailToken, type EmailTokenType } from '../database/entities/email-token.entity';
import { addMs, DAY, hashToken, MINUTE, randomToken } from './tokens';

export const EMAIL_TOKEN_TTL_MS: Record<EmailTokenType, number> = {
  verify_email: DAY,
  reset_password: 30 * MINUTE,
};

/** Single-use links sent by email. Only the hash is stored. */
@Injectable()
export class EmailTokensService {
  constructor(
    @InjectRepository(EmailToken) private readonly tokens: Repository<EmailToken>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Creates a link token, or returns null when one was sent less than a minute ago
   * (the "Resend in 0:58" cooldown). Issuing a new token invalidates the previous ones.
   */
  async issue(userId: string, type: EmailTokenType): Promise<string | null> {
    const now = this.clock.now();
    const recent = await this.tokens.existsBy({
      userId,
      type,
      createdAt: MoreThan(addMs(now, -RESEND_COOLDOWN_SECONDS * 1000)),
    });
    if (recent) return null;

    await this.tokens.update({ userId, type, usedAt: IsNull() }, { usedAt: now });
    const token = randomToken();
    await this.tokens.insert({
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: addMs(now, EMAIL_TOKEN_TTL_MS[type]),
      createdAt: now,
    });
    return token;
  }

  /** Marks the token used and returns its user id, or null if unknown, used or expired. */
  async consume(token: string, type: EmailTokenType): Promise<string | null> {
    const now = this.clock.now();
    const row = await this.tokens.findOneBy({ tokenHash: hashToken(token), type });
    if (!row || row.usedAt || row.expiresAt <= now) return null;
    // Conditional update: two simultaneous clicks cannot both succeed.
    const result = await this.tokens.update({ id: row.id, usedAt: IsNull() }, { usedAt: now });
    return result.affected === 1 ? row.userId : null;
  }
}
