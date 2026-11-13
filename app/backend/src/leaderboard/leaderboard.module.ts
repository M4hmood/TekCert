import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { ProgressModule } from '../progress/progress.module';
import { UsersModule } from '../users/users.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

/**
 * Leaderboards (ADR-022). No entities of its own: it depends on users, certifications and
 * progress, and nothing depends on it.
 */
@Module({
  imports: [UsersModule, CertificationsModule, ProgressModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
