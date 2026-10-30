import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@tekcert/types';
import type { Request } from 'express';
import type { AccessClaims } from '../access-token.service';

export const IS_PUBLIC = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/** Opts a route (or controller) out of the global authentication guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restricts a route to the given roles; authenticated users with another role get 403. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export type AuthenticatedRequest = Request & { auth?: AccessClaims };

/** The verified access-token claims of the caller. Only valid on non-public routes. */
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const auth = ctx.switchToHttp().getRequest<AuthenticatedRequest>().auth;
  if (!auth) throw new Error('CurrentAuth used on a public route');
  return auth;
});
