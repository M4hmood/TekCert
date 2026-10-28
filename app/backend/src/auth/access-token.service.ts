import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Role, RoleSchema } from '@tekcert/types';
import jwt from 'jsonwebtoken';
import { CLOCK, type Clock } from '../common/clock';
import type { Env } from '../config/env';
import { MINUTE } from './tokens';

export const ACCESS_TOKEN_TTL_MS = 15 * MINUTE;
const ISSUER = 'tekcert-api';
const AUDIENCE = 'tekcert';

export interface AccessClaims {
  userId: string;
  role: Role;
}

/** Short-lived HS256 JWT carried in the tc_access cookie. */
@Injectable()
export class AccessTokenService {
  private readonly secret: string;

  constructor(
    config: ConfigService<Env, true>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.secret = config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  sign({ userId, role }: AccessClaims): Promise<string> {
    // iat comes from the injected clock so expiry can be tested; exp is derived from it.
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    return Promise.resolve(
      jwt.sign({ role, iat }, this.secret, {
        algorithm: 'HS256',
        subject: userId,
        issuer: ISSUER,
        audience: AUDIENCE,
        expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
      }),
    );
  }

  /** Returns the claims, or null when the token is missing, tampered with or expired. */
  verify(token: string | undefined): Promise<AccessClaims | null> {
    if (!token) return Promise.resolve(null);
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      });
      if (typeof payload === 'string' || !payload.sub) return Promise.resolve(null);
      const role = RoleSchema.safeParse(payload.role);
      return Promise.resolve(role.success ? { userId: payload.sub, role: role.data } : null);
    } catch {
      return Promise.resolve(null);
    }
  }
}
