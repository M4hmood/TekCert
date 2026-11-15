import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { PathsModule } from '../paths/paths.module';
import { SchoolModule } from '../school/school.module';
import { UsersModule } from '../users/users.module';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

/**
 * The numbers of the public landing page (ADR-024). No entities of its own: it depends on
 * users, school, certifications and paths, and nothing depends on it.
 */
@Module({
  imports: [UsersModule, SchoolModule, CertificationsModule, PathsModule],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
