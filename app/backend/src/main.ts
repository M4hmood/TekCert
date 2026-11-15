import 'reflect-metadata';
// Loaded first, so an error while the app is being built is reported too.
import { initMonitoring } from './monitoring/monitoring';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { configureApp } from './setup';

async function bootstrap(): Promise<void> {
  initMonitoring();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
