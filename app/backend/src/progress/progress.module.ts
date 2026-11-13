import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsModule } from '../certifications/certifications.module';
import { PathsModule } from '../paths/paths.module';
import { UsersModule } from '../users/users.module';
import { ActivityService } from './activity.service';
import { DashboardService } from './dashboard.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { PointEvent } from './entities/point-event.entity';
import { UserBadge } from './entities/user-badge.entity';
import { PointsService } from './points.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

/**
 * Points, badges, the classmates feed and the dashboard (ADR-020). Depends on certifications,
 * paths and users; the community and leaderboard modules read points and activity from it (ADR-021, ADR-022).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PointEvent, UserBadge, ActivityEvent]),
    CertificationsModule,
    PathsModule,
    UsersModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, PointsService, ActivityService, DashboardService],
  exports: [PointsService, ActivityService],
})
export class ProgressModule {}
