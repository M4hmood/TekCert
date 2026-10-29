import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_PROBLEM, type Role } from '@tekcert/types';
import { ProblemException } from '../common/problem.exception';
import { AccessTokenService } from './access-token.service';
import { ACCESS_COOKIE } from './cookies';
import { type AuthenticatedRequest, IS_PUBLIC, ROLES_KEY } from './decorators';

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

/** Global, runs after AuthGuard: enforces @Roles() where present. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (auth && roles.includes(auth.role)) return true;
    throw new ProblemException({
      type: 'about:blank',
      title: 'Forbidden',
      status: HttpStatus.FORBIDDEN,
    });
  }
}
