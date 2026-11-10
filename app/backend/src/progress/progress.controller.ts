import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  CertificationParamsDto,
  MyCertificationDto,
} from '../certifications/dto/certifications.dto';
import { UsersService } from '../users/users.service';
import { ActivityService } from './activity.service';
import { DashboardService } from './dashboard.service';
import {
  ActivityFeedDto,
  ActivityQueryDto,
  ChapterParamsDto,
  ChapterTickResultDto,
  DashboardDto,
  MyPointsDto,
} from './dto/progress.dto';
import { PointsService } from './points.service';
import { ProgressService } from './progress.service';

/** The signed-in student's progress: starting, ticking chapters, points and the dashboard. */
@ApiTags('progress')
@Controller()
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly points: PointsService,
    private readonly dashboard: DashboardService,
    private readonly activity: ActivityService,
    private readonly users: UsersService,
  ) {}

  @Put('me/preparations/:slug')
  @ApiOperation({ summary: 'Start preparing a certification (201 the first time, then 200)' })
  @ZodResponse({ type: MyCertificationDto, status: HttpStatus.OK })
  async start(
    @CurrentAuth() auth: AccessClaims,
    @Param() params: CertificationParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { created, ...status } = await this.progress.start(auth.userId, params.slug);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return status;
  }

  @Put('me/chapters/:chapterId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tick a chapter: +10 points (ticking it again changes nothing)' })
  @ZodResponse({ type: ChapterTickResultDto, status: HttpStatus.OK })
  tick(@CurrentAuth() auth: AccessClaims, @Param() params: ChapterParamsDto) {
    return this.progress.setChapter(auth.userId, params.chapterId, true);
  }

  @Delete('me/chapters/:chapterId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Untick a chapter: −10 points (unticking it again changes nothing)' })
  @ZodResponse({ type: ChapterTickResultDto, status: HttpStatus.OK })
  untick(@CurrentAuth() auth: AccessClaims, @Param() params: ChapterParamsDto) {
    return this.progress.setChapter(auth.userId, params.chapterId, false);
  }

  @Get('me/points')
  @ApiOperation({ summary: 'My points (summed from the ledger), level and badges' })
  @ZodResponse({ type: MyPointsDto })
  myPoints(@CurrentAuth() auth: AccessClaims) {
    return this.points.summary(auth.userId);
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: 'My dashboard: current certification, level, next step, path' })
  @ZodResponse({ type: DashboardDto })
  myDashboard(@CurrentAuth() auth: AccessClaims) {
    return this.dashboard.forUser(auth.userId);
  }

  /** Names students, so signed-in students only. */
  @Get('activity')
  @ApiOperation({ summary: 'Classmate activity in a scope relative to me' })
  @ZodResponse({ type: ActivityFeedDto })
  async feed(@CurrentAuth() auth: AccessClaims, @Query() query: ActivityQueryDto) {
    const viewer = await this.users.findWithEnrolment(auth.userId);
    if (!viewer) throw new UnauthorizedException();
    return this.activity.feed(viewer, query.scope);
  }
}
