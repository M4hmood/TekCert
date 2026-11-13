import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressModule } from '../progress/progress.module';
import { UsersModule } from '../users/users.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RankDigestService } from './rank-digest.service';

/**
 * Leaderboards (ADR-022) and the weekly "your rank moved" notification (ADR-023). No entities
 * of its own: it depends on users, certifications, progress and notifications, and nothing
 * depends on it.
 */
@Module({
  imports: [UsersModule, CertificationsModule, ProgressModule, NotificationsModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, RankDigestService],
})
export class LeaderboardModule {}
