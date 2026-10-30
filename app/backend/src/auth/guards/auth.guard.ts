import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_PROBLEM } from '@tekcert/types';
import { ProblemException } from '../../common/exceptions/problem.exception';
import { AccessTokenService } from '../access-token.service';
import { ACCESS_COOKIE } from '../utils/cookies';
import { type AuthenticatedRequest, IS_PUBLIC } from '../decorators/auth.decorators';

/** Global: every route needs a valid access cookie unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const claims = await this.accessTokens.verify(cookies?.[ACCESS_COOKIE]);
    if (!claims) {
      throw new ProblemException({
        type: AUTH_PROBLEM.unauthenticated,
        title: 'Sign in required',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    request.auth = claims;
    return true;
  }
}
