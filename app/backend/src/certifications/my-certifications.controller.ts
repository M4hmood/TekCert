import { Controller, Get, HttpStatus, Param, Put, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  CertificationParamsDto,
  MyCertificationDto,
  MyCertificationsDto,
} from './dto/certifications.dto';
import { CertificationsService } from './certifications.service';

/** The signed-in student's own certifications. */
@ApiTags('certifications')
@Controller('me')
export class MyCertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  @Get('certifications')
  @ApiOperation({ summary: 'My certifications: held (unverified) or in progress' })
  @ZodResponse({ type: MyCertificationsDto })
  mine(@CurrentAuth() auth: AccessClaims) {
    return this.certifications.mine(auth.userId);
  }

  @Put('preparations/:slug')
  @ApiOperation({ summary: 'Start preparing a certification (201 the first time, then 200)' })
  @ZodResponse({ type: MyCertificationDto, status: HttpStatus.OK })
  async start(
    @CurrentAuth() auth: AccessClaims,
    @Param() params: CertificationParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { created, ...status } = await this.certifications.start(auth.userId, params.slug);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return status;
  }
}
