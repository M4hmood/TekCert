import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { originCheck } from './common/origin-check';
import type { Env } from './config/env';

/** HTTP-level setup shared by main.ts and the e2e tests, so tests run the real stack. */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const allowedOrigins = [
    config.get('WEB_URL', { infer: true }),
    ...config.get('CORS_ORIGIN', { infer: true }),
  ];

  // The API sits behind the web proxy and load balancers on private networks: trust their
  // X-Forwarded-For so rate limits and session records see the real client IP.
  (app.getHttpAdapter().getInstance() as Express).set(
    'trust proxy',
    'loopback, linklocal, uniquelocal',
  );

  app.useLogger(app.get(Logger));
  // The API only serves JSON; CSP is turned off so the Swagger UI at /docs can run its inline script.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(originCheck(allowedOrigins));
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TekCert API')
      .setDescription('REST API for the TekCert certification platform.')
      .setVersion('0.2.0')
      .addCookieAuth('tc_access')
      .build(),
  );
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  return app;
}
