import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailTokensService } from './email-tokens.service';
import { EmailToken } from './entities/email-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { Session } from './entities/session.entity';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginAttemptsService } from './login-attempts.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, EmailToken, LoginAttempt]),
    UsersModule,
    // Per-IP brake on /auth/* (applied by the controller); the per-account lockout is separate.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        { ttl: 60_000, limit: config.get('AUTH_RATE_LIMIT', { infer: true }) },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AccessTokenService,
    PasswordService,
    SessionsService,
    LoginAttemptsService,
    EmailTokensService,
    AuthService,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
