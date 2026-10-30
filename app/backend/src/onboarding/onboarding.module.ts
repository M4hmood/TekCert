import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CLOCK, systemClock } from '../common/clock';
import {
  Certification,
  Path,
  SchoolClass,
  Specialty,
  User,
  UserCertification,
} from '../database/entities';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SchoolClass,
      Specialty,
      Certification,
      UserCertification,
      Path,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [{ provide: CLOCK, useValue: systemClock }, OnboardingService],
})
export class OnboardingModule {}
