import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type EnrolmentInput, EnrolmentSchema } from '@tekcert/types';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  CertificationPicksDto,
  OnboardingStateDto,
  PrivacyDto,
  RecommendedPathDto,
} from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

type BodySchema = NonNullable<
  Extract<Parameters<typeof ApiBody>[0], { schema?: unknown }>['schema']
>;
const ENROLMENT_OPENAPI = z.toJSONSchema(EnrolmentSchema, { target: 'openapi-3.0' }) as BodySchema;

/** Every step answers with the whole onboarding state, so the wizard just replaces its copy. */
@ApiTags('onboarding')
@Controller()
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('onboarding')
  @ApiOperation({ summary: 'Saved answers, the step to resume at, and the specialty options' })
  @ZodResponse({ type: OnboardingStateDto })
  state(@CurrentAuth() auth: AccessClaims) {
    return this.onboarding.state(auth.userId);
  }

  @Put('onboarding/enrolment')
  @ApiOperation({ summary: 'Step 2: year, specialty (ING-4/5) or target specialty, and group' })
  @ZodResponse({ type: OnboardingStateDto })
  @ApiBody({ schema: ENROLMENT_OPENAPI })
  saveEnrolment(
    @CurrentAuth() auth: AccessClaims,
    @Body(new ZodValidationPipe(EnrolmentSchema)) body: EnrolmentInput,
  ) {
    return this.onboarding.saveEnrolment(auth.userId, body);
  }

  @Put('onboarding/certifications')
  @ApiOperation({ summary: 'Step 3: certifications already held, saved as unverified' })
  @ZodResponse({ type: OnboardingStateDto })
  saveCertifications(@CurrentAuth() auth: AccessClaims, @Body() body: CertificationPicksDto) {
    return this.onboarding.saveCertifications(auth.userId, body.slugs);
  }

  @Put('onboarding/privacy')
  @ApiOperation({ summary: 'Step 4: appear on leaderboards or not' })
  @ZodResponse({ type: OnboardingStateDto })
  savePrivacy(@CurrentAuth() auth: AccessClaims, @Body() body: PrivacyDto) {
    return this.onboarding.savePrivacy(auth.userId, body);
  }

  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish onboarding (needs step 2)' })
  @ZodResponse({ status: HttpStatus.OK, type: OnboardingStateDto })
  complete(@CurrentAuth() auth: AccessClaims) {
    return this.onboarding.complete(auth.userId);
  }

  @Get('me/recommended-path')
  @ApiOperation({ summary: 'The path recommended from the class or target specialty' })
  @ZodResponse({ type: RecommendedPathDto })
  recommendedPath(@CurrentAuth() auth: AccessClaims) {
    return this.onboarding.recommendedPath(auth.userId);
  }
}
