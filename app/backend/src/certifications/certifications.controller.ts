import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/decorators';
import {
  CertificationDetailDto,
  CertificationListDto,
  CertificationListQueryDto,
  CertificationParamsDto,
} from './certifications.dto';
import { CertificationsService } from './certifications.service';

/** Read-only catalog, public: the sign-in page and the landing page show it. */
@Public()
@ApiTags('certifications')
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List the funded certification catalog' })
  @ZodResponse({ type: CertificationListDto })
  list(@Query() query: CertificationListQueryDto) {
    return this.certifications.list(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'One certification with its exam domains and chapters' })
  @ZodResponse({ type: CertificationDetailDto })
  findOne(@Param() params: CertificationParamsDto) {
    return this.certifications.findBySlug(params.slug);
  }
}
