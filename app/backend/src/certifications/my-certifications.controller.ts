import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  CertificationParamsDto,
  MyCertificationProgressDto,
  MyCertificationsDto,
} from './dto/certifications.dto';
import { CertificationsService } from './certifications.service';

/**
 * The signed-in student's own certifications. "Start" (`PUT /me/preparations/:slug`) lives in
 * the progress module, which also announces it in the classmates feed.
 */
@ApiTags('certifications')
@Controller('me/certifications')
export class MyCertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My certifications: held (unverified) or in progress' })
  @ZodResponse({ type: MyCertificationsDto })
  mine(@CurrentAuth() auth: AccessClaims) {
    return this.certifications.mine(auth.userId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'My status on one certification and the chapters I ticked' })
  @ZodResponse({ type: MyCertificationProgressDto })
  one(@CurrentAuth() auth: AccessClaims, @Param() params: CertificationParamsDto) {
    return this.certifications.myProgress(auth.userId, params.slug);
  }
}
