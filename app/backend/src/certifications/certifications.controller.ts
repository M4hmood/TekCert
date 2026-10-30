import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth, Public } from '../auth/decorators/auth.decorators';
import {
  CertificationCommunityDto,
  CertificationDetailDto,
  CertificationListDto,
  CertificationListQueryDto,
  CertificationParamsDto,
  CommunityQueryDto,
} from './dto/certifications.dto';
import { CertificationsService } from './certifications.service';

@ApiTags('certifications')
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  /** Public: the sign-in page and the landing page show the catalog. Counts name nobody. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Search and filter the funded certification catalog' })
  @ZodResponse({ type: CertificationListDto })
  list(@Query() query: CertificationListQueryDto) {
    return this.certifications.list(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'One certification: facts, syllabus, resources and prerequisites' })
  @ZodResponse({ type: CertificationDetailDto })
  findOne(@Param() params: CertificationParamsDto) {
    return this.certifications.findBySlug(params.slug);
  }

  /** Names students, so signed-in students only. */
  @Get(':slug/community')
  @ApiOperation({ summary: 'Who to ask: students who hold or are preparing the certification' })
  @ZodResponse({ type: CertificationCommunityDto })
  community(
    @CurrentAuth() auth: AccessClaims,
    @Param() params: CertificationParamsDto,
    @Query() query: CommunityQueryDto,
  ) {
    return this.certifications.community(auth.userId, params.slug, query);
  }
}
