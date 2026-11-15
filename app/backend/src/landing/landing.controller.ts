import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PUBLIC_STATS_MAX_AGE } from '@tekcert/types';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/decorators/auth.decorators';
import { PublicStatsDto } from './dto/landing.dto';
import { LandingService } from './landing.service';

@ApiTags('landing')
@Controller('stats')
export class LandingController {
  constructor(private readonly landing: LandingService) {}

  /** Public: totals only, nothing about any one student. */
  @Public()
  @Get('public')
  @Header('cache-control', `public, max-age=${PUBLIC_STATS_MAX_AGE}`)
  @ApiOperation({ summary: 'Totals for the landing page: catalog, students, paths' })
  @ZodResponse({ type: PublicStatsDto })
  publicStats() {
    return this.landing.publicStats();
  }
}
