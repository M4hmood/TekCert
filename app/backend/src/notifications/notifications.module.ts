import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsModule } from '../certifications/certifications.module';
import { UsersModule } from '../users/users.module';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Notifications and their preferences (ADR-023). Progress and the leaderboard announce events
 * through the exported service; this module depends only on users and certifications.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    UsersModule,
    CertificationsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
