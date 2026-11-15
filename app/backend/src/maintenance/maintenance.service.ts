import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthCleanupService } from '../auth/auth-cleanup.service';
import { CLOCK, type Clock } from '../common/utils/clock';
import { NotificationsService } from '../notifications/notifications.service';
import { TIME_ZONE } from '../progress/utils/labels';

const DAY_MS = 86_400_000;
/** A week of margin after expiry: a revoked session still explains a reused refresh token. */
export const EXPIRED_KEPT_DAYS = 7;
export const LOGIN_ATTEMPTS_KEPT_DAYS = 30;
export const NOTIFICATIONS_KEPT_DAYS = 90;

export interface CleanupResult {
  sessions: number;
  emailTokens: number;
  loginAttempts: number;
  notifications: number;
}

/**
 * The nightly clean-up (ADR-024). It only deletes rows nothing reads any more; the points
 * ledger and the activity feed are never touched. Running it twice, or on two servers, is
 * harmless: the second run finds nothing left.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger('Maintenance');

  constructor(
    private readonly auth: AuthCleanupService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Every night at 03:30 in Tunis. */
  @Cron('30 3 * * *', { name: 'cleanup', timeZone: TIME_ZONE })
  async scheduled(): Promise<void> {
    try {
      const removed = await this.cleanUp();
      this.logger.log(`Clean-up removed ${JSON.stringify(removed)}`);
    } catch (error) {
      this.logger.error(`Clean-up failed: ${String(error)}`);
    }
  }

  async cleanUp(): Promise<CleanupResult> {
    const now = this.clock.now().getTime();
    const daysAgo = (days: number) => new Date(now - days * DAY_MS);
    const [auth, notifications] = await Promise.all([
      this.auth.deleteExpired(daysAgo(EXPIRED_KEPT_DAYS), daysAgo(LOGIN_ATTEMPTS_KEPT_DAYS)),
      this.notifications.deleteOlderThan(daysAgo(NOTIFICATIONS_KEPT_DAYS)),
    ]);
    return { ...auth, notifications };
  }
}
