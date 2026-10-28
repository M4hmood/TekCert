import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './config/env';

/** HTTP-level setup shared by main.ts and the e2e tests, so tests run the real stack. */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  // The API only serves JSON; CSP is turned off so the Swagger UI at /docs can run its inline script.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TekCert API')
      .setDescription('REST API for the TekCert certification platform.')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  return app;
}
