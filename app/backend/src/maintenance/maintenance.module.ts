import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MaintenanceService } from './maintenance.service';

/** The nightly clean-up of rows nothing reads any more (ADR-024). Nothing depends on it. */
@Module({
  imports: [AuthModule, NotificationsModule],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
