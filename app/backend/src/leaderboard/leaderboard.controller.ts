import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import {
  LeaderboardQueryDto,
  SpecialtyBoardQueryDto,
  SpecialtyLeaderboardDto,
  StudentLeaderboardDto,
} from './dto/leaderboard.dto';
import { LeaderboardService } from './leaderboard.service';

/** Both boards name students or rank the viewer, so signed-in students only. */
@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get('students')
  @ApiOperation({ summary: 'Students ranked by points in a scope relative to me, over a period' })
  @ZodResponse({ type: StudentLeaderboardDto })
  students(@CurrentAuth() auth: AccessClaims, @Query() query: LeaderboardQueryDto) {
    return this.leaderboard.students(auth.userId, query);
  }

  @Get('specialties')
  @ApiOperation({ summary: 'Specialties ranked by average points per student, over a period' })
  @ZodResponse({ type: SpecialtyLeaderboardDto })
  specialties(@CurrentAuth() auth: AccessClaims, @Query() query: SpecialtyBoardQueryDto) {
    return this.leaderboard.specialties(auth.userId, query.period);
  }
}
