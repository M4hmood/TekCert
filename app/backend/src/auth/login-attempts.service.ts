import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from '@tekcert/types';
import type { Repository } from 'typeorm';
import { CLOCK, type Clock } from '../common/utils/clock';
import { LoginAttempt } from './entities/login-attempt.entity';
import { addMs, MINUTE } from './utils/tokens';

const LOCKOUT_MS = LOCKOUT_MINUTES * MINUTE;

export type AttemptStatus = { locked: true; retryAfterSeconds: number } | { locked: false };

export type FailureResult =
  { locked: true; retryAfterSeconds: number } | { locked: false; attemptsLeft: number };

/**
 * 5 failed sign-ins on one address lock it for 15 minutes. Failures older than the lockout window
 * are forgotten, and a successful sign-in resets the count.
 */
@Injectable()
export class LoginAttemptsService {
  constructor(
    @InjectRepository(LoginAttempt) private readonly attempts: Repository<LoginAttempt>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async status(email: string): Promise<AttemptStatus> {
    const row = await this.attempts.findOneBy({ email });
    const now = this.clock.now();
    if (row?.lockedUntil && row.lockedUntil > now) {
      return { locked: true, retryAfterSeconds: secondsBetween(now, row.lockedUntil) };
    }
    return { locked: false };
  }

  async recordFailure(email: string): Promise<FailureResult> {
    const now = this.clock.now();
    const row = await this.attempts.findOneBy({ email });
    const stale =
      !row ||
      (row.lockedUntil !== null && row.lockedUntil <= now) ||
      now.getTime() - row.lastFailedAt.getTime() > LOCKOUT_MS;
    const failedCount = (stale ? 0 : row.failedCount) + 1;

    if (failedCount >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = addMs(now, LOCKOUT_MS);
      await this.attempts.save({ email, failedCount, lockedUntil, lastFailedAt: now });
      return { locked: true, retryAfterSeconds: secondsBetween(now, lockedUntil) };
    }
    await this.attempts.save({ email, failedCount, lockedUntil: null, lastFailedAt: now });
    return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS - failedCount };
  }

  async reset(email: string): Promise<void> {
    await this.attempts.delete({ email });
  }
}

function secondsBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 1000));
}
