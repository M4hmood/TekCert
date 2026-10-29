import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type Accepted, AUTH_PROBLEM } from '@tekcert/types';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import type { AccessClaims } from './access-token.service';
import { ProblemException } from '../common/problem.exception';
import type { Env } from '../config/env';
import {
  AcceptedDto,
  CurrentUserDto,
  EmailOnlyDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  VerifyEmailDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from './cookies';
import { CurrentAuth, Public } from './decorators';
import { type DeviceInfo, SessionsService } from './sessions.service';

const ACCEPTED: Accepted = { status: 'accepted' };

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies = config.get('COOKIE_SECURE', { infer: true });
  }

  @Public()
  @Post('sign-up')
  @ApiOperation({ summary: 'Create an account and send the verification email' })
  @ZodResponse({ status: HttpStatus.ACCEPTED, type: AcceptedDto })
  async signUp(@Body() body: SignUpDto) {
    await this.auth.signUp(body);
    return ACCEPTED;
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Send the verification email again (at most once a minute)' })
  @ZodResponse({ status: HttpStatus.ACCEPTED, type: AcceptedDto })
  async resendVerification(@Body() body: EmailOnlyDto) {
    await this.auth.resendVerification(body.email);
    return ACCEPTED;
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Confirm the email address and sign in' })
  @ZodResponse({ status: HttpStatus.OK, type: CurrentUserDto })
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, session } = await this.auth.verifyEmail(body.token, device(req));
    setSessionCookies(res, session, this.secureCookies);
    return user;
  }

  @Public()
  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in; 5 failures lock the address for 15 minutes' })
  @ZodResponse({ status: HttpStatus.OK, type: CurrentUserDto })
  async signIn(
    @Body() body: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, session } = await this.auth.signIn(body, device(req));
    setSessionCookies(res, session, this.secureCookies);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const result = await this.sessions.rotate(refreshCookie(req), device(req));
    if (!result.ok) {
      // A parallel request already rotated this token; keep the cookies it received.
      if (result.reason !== 'raced') clearSessionCookies(res, this.secureCookies);
      throw new ProblemException({
        type: AUTH_PROBLEM.unauthenticated,
        title: 'Sign in required',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    setSessionCookies(res, result.session, this.secureCookies);
  }

  @Public()
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out on this device' })
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.sessions.revokeByToken(refreshCookie(req));
    clearSessionCookies(res, this.secureCookies);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send a 30-minute reset link if the account exists' })
  @ZodResponse({ status: HttpStatus.ACCEPTED, type: AcceptedDto })
  async forgotPassword(@Body() body: EmailOnlyDto) {
    await this.auth.forgotPassword(body.email);
    return ACCEPTED;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password and sign out every device' })
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in student' })
  @ZodResponse({ type: CurrentUserDto })
  me(@CurrentAuth() auth: AccessClaims) {
    return this.auth.me(auth.userId);
  }
}

function refreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[REFRESH_COOKIE];
}

function device(req: Request): DeviceInfo {
  return { userAgent: req.get('user-agent'), ip: req.ip };
}
