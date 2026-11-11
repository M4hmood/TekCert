import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { PathsModule } from '../paths/paths.module';
import { ProgressModule } from '../progress/progress.module';
import { UsersModule } from '../users/users.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

/**
 * The student directory and profiles (ADR-021). No entities of its own: it depends on users,
 * certifications, progress and paths, and nothing depends on it.
 */
@Module({
  imports: [UsersModule, CertificationsModule, ProgressModule, PathsModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
