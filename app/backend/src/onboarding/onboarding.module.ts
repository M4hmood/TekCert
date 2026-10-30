import { Module } from '@nestjs/common';
import { CertificationsModule } from '../certifications/certifications.module';
import { PathsModule } from '../paths/paths.module';
import { SchoolModule } from '../school/school.module';
import { UsersModule } from '../users/users.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [UsersModule, SchoolModule, CertificationsModule, PathsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
