import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CLOCK, type Clock } from '../src/common/utils/clock';
import { InMemoryMailSender, MAIL_SENDER } from '../src/mail/interfaces/mail-sender';
import { configureApp } from '../src/setup';

/** A clock the tests can move forward to cross expiry and lockout windows. */
export class TestClock implements Clock {
  private offsetMs = 0;

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  advanceMinutes(minutes: number): void {
    this.offsetMs += minutes * 60_000;
  }
}

export interface TestApp {
  app: INestApplication<App>;
  mail: InMemoryMailSender;
  clock: TestClock;
}

/** The real application, with emails captured in memory and a controllable clock. */
export async function createTestApp(): Promise<TestApp> {
  const mail = new InMemoryMailSender();
  const clock = new TestClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_SENDER)
    .useValue(mail)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  configureApp(app);
  await app.init();
  return { app, mail, clock };
}

/** A fresh institute address per test, so tests never share accounts or lockouts. */
export function uniqueEmail(prefix = 'student'): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@tek-up.de`;
}

/** Extracts the token from the last link sent to an address. */
export function tokenFromMail(mail: InMemoryMailSender, to: string, path: string): string {
  const message = mail.lastTo(to);
  const match = message?.text.match(new RegExp(`${path}\\?token=([A-Za-z0-9_-]{43})`));
  if (!match?.[1]) throw new Error(`No ${path} link sent to ${to}`);
  return match[1];
}

export const PASSWORD = 'correct-horse-9';

/** POST /auth/sign-up with valid defaults (visibility accepted); `extra` overrides any field. */
export function signUpRequest(
  server: App,
  email: string,
  extra: Record<string, unknown> = {},
): request.Test {
  return request(server)
    .post('/auth/sign-up')
    .send({
      firstName: 'Yassine',
      lastName: 'Ben Amor',
      email,
      password: PASSWORD,
      acceptVisibility: true,
      ...extra,
    });
}

/** Signs up and verifies; returns an agent that holds the session cookies. */
export async function signUpAndVerify(
  t: TestApp,
  email = uniqueEmail(),
  names: { firstName?: string; lastName?: string } = {},
): Promise<{ agent: ReturnType<typeof request.agent>; email: string }> {
  const server = t.app.getHttpServer();
  await signUpRequest(server, email, names).expect(202);
  const agent = request.agent(server);
  await agent
    .post('/auth/verify-email')
    .send({ token: tokenFromMail(t.mail, email, '/verify-email') })
    .expect(200);
  return { agent, email };
}
