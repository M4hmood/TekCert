import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from '../auth/access-token.service';
import { CurrentAuth } from '../auth/decorators/auth.decorators';
import { CommunityService } from './community.service';
import {
  DirectoryDto,
  DirectoryQueryDto,
  MyProfileSettingsDto,
  StudentParamsDto,
  StudentProfileDto,
  UpdateMyProfileDto,
} from './dto/community.dto';

/** Every route names students, so all of them need a signed-in student. */
@ApiTags('community')
@Controller()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('community/students')
  @ApiOperation({ summary: 'The student directory: a scope relative to me, search and filters' })
  @ZodResponse({ type: DirectoryDto })
  directory(@CurrentAuth() auth: AccessClaims, @Query() query: DirectoryQueryDto) {
    return this.community.directory(auth.userId, query);
  }

  @Get('community/students/:id')
  @ApiOperation({ summary: "A student's profile (404 until they verified and onboarded)" })
  @ZodResponse({ type: StudentProfileDto })
  profile(@CurrentAuth() auth: AccessClaims, @Param() params: StudentParamsDto) {
    return this.community.profile(auth.userId, params.id);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'My profile as others see it, plus my privacy choices' })
  @ZodResponse({ type: StudentProfileDto })
  myProfile(@CurrentAuth() auth: AccessClaims) {
    return this.community.profile(auth.userId, auth.userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Switch "Available to help" or my name on the leaderboard' })
  @ZodResponse({ type: MyProfileSettingsDto })
  updateMine(@CurrentAuth() auth: AccessClaims, @Body() body: UpdateMyProfileDto) {
    return this.community.updateMine(auth.userId, body);
  }
}
