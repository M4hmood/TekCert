import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { CLOCK, type Clock } from '../common/utils/clock';
import type { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AccessTokenService } from './access-token.service';
import { Session } from './entities/session.entity';
import type { IssuedSession } from './utils/cookies';
import { addMs, DAY, hashToken, HOUR, randomToken } from './utils/tokens';

/** "Stay signed in": 30 days, extended on every refresh. */
export const REMEMBER_TTL_MS = 30 * DAY;
/** Without "stay signed in": a browser-session cookie, and the sign-in ends after 12 hours. */
export const SESSION_TTL_MS = 12 * HOUR;
/**
 * Parallel requests can refresh with the same token a moment apart. A token reused within this
 * window is rejected without being treated as theft.
 */
const REUSE_GRACE_MS = 10_000;

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
}

export type RotateResult =
  | { ok: true; session: IssuedSession }
  | { ok: false; reason: 'unknown' | 'expired' | 'reused' | 'raced' };

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly users: UsersService,
    private readonly accessTokens: AccessTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Starts a new sign-in (a new token family). */
  async create(user: User, remember: boolean, device: DeviceInfo): Promise<IssuedSession> {
    const now = this.clock.now();
    const expiresAt = addMs(now, remember ? REMEMBER_TTL_MS : SESSION_TTL_MS);
    return this.issue(user, { familyId: randomUUID(), remember, expiresAt }, device);
  }

  /** Swaps a refresh token for a new one. Reusing an already-rotated token revokes the family. */
  async rotate(refreshToken: string | undefined, device: DeviceInfo): Promise<RotateResult> {
    if (!refreshToken) return { ok: false, reason: 'unknown' };
    const now = this.clock.now();
    const current = await this.sessions.findOneBy({ tokenHash: hashToken(refreshToken) });
    if (!current) return { ok: false, reason: 'unknown' };

    if (current.revokedAt) {
      if (current.replacedById && now.getTime() - current.revokedAt.getTime() < REUSE_GRACE_MS) {
        return { ok: false, reason: 'raced' };
      }
      await this.revokeFamily(current.familyId);
      return { ok: false, reason: 'reused' };
    }
    if (current.expiresAt <= now) return { ok: false, reason: 'expired' };

    const user = await this.users.findById(current.userId);
    if (!user) return { ok: false, reason: 'unknown' };

    // Remembered sessions slide forward; browser sessions keep their original 12-hour cap.
    const expiresAt = current.remember ? addMs(now, REMEMBER_TTL_MS) : current.expiresAt;
    const next = await this.issue(
      user,
      { familyId: current.familyId, remember: current.remember, expiresAt },
      device,
    );
    await this.sessions.update(
      { id: current.id },
      { revokedAt: now, replacedById: next.sessionId, lastUsedAt: now },
    );
    return { ok: true, session: next };
  }

  /** Signs out this device: revokes every token of the presented token's family. */
  async revokeByToken(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.sessions.findOneBy({ tokenHash: hashToken(refreshToken) });
    if (session) await this.revokeFamily(session.familyId);
  }

  /** Signs the user out everywhere (after a password reset). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.update({ userId, revokedAt: IsNull() }, { revokedAt: this.clock.now() });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.sessions.update({ familyId, revokedAt: IsNull() }, { revokedAt: this.clock.now() });
  }

  private async issue(
    user: User,
    family: { familyId: string; remember: boolean; expiresAt: Date },
    device: DeviceInfo,
  ): Promise<IssuedSession & { sessionId: string }> {
    const refreshToken = randomToken();
    const row = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        familyId: family.familyId,
        tokenHash: hashToken(refreshToken),
        remember: family.remember,
        expiresAt: family.expiresAt,
        userAgent: device.userAgent?.slice(0, 255) ?? null,
        ip: device.ip?.slice(0, 64) ?? null,
        lastUsedAt: this.clock.now(),
      }),
    );
    return {
      sessionId: row.id,
      accessToken: await this.accessTokens.sign({ userId: user.id, role: user.role }),
      refreshToken,
      remember: family.remember,
      refreshExpiresAt: family.expiresAt,
    };
  }
}
