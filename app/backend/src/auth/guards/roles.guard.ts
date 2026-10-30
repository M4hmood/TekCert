import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@tekcert/types';
import { ProblemException } from '../../common/exceptions/problem.exception';
import { type AuthenticatedRequest, ROLES_KEY } from '../decorators/auth.decorators';

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
