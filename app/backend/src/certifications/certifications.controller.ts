import { Controller, Get, Header, Param, Query } from '@nestjs/common';
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

/**
 * The catalog is the same for everyone and changes rarely: a browser or a CDN may reuse an
 * answer for a minute, and serve it a little longer while it fetches a new one.
 */
const PUBLIC_CATALOG_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@ApiTags('certifications')
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  /** Public: the sign-in page and the landing page show the catalog. Counts name nobody. */
  @Public()
  @Get()
  @Header('cache-control', PUBLIC_CATALOG_CACHE)
  @ApiOperation({ summary: 'Search and filter the funded certification catalog' })
  @ZodResponse({ type: CertificationListDto })
  list(@Query() query: CertificationListQueryDto) {
    return this.certifications.list(query);
  }

  @Public()
  @Get(':slug')
  @Header('cache-control', PUBLIC_CATALOG_CACHE)
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
