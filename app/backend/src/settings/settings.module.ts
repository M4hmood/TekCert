import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { ProgressModule } from '../progress/progress.module';
import { SchoolModule } from '../school/school.module';
import { UsersModule } from '../users/users.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * Settings, the academic-year answer and the data export (ADR-023). No entities of its own: it
 * depends on users, school, certifications and progress, and nothing depends on it.
 */
@Module({
  imports: [UsersModule, SchoolModule, CertificationsModule, ProgressModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
