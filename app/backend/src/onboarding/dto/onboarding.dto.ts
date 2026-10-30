import {
  CertificationPicksSchema,
  OnboardingStateSchema,
  PrivacySchema,
  RecommendedPathSchema,
} from '@tekcert/types';
import { createZodDto } from 'nestjs-zod';

// The enrolment is a union (ING-4/5 vs ING-1…3), which a DTO class can't extend: the controller
// validates it with a ZodValidationPipe instead.
export class CertificationPicksDto extends createZodDto(CertificationPicksSchema) {}
export class PrivacyDto extends createZodDto(PrivacySchema) {}
export class OnboardingStateDto extends createZodDto(OnboardingStateSchema) {}
export class RecommendedPathDto extends createZodDto(RecommendedPathSchema) {}
