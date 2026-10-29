import request from 'supertest';
import type { TestApp } from './test-app';

type TestAppModule = typeof import('./test-app.js');

describe('Per-IP rate limit on /auth (e2e)', () => {
  let t: TestApp;
  const previous = process.env.AUTH_RATE_LIMIT;

  beforeAll(async () => {
    // ConfigModule reads the environment when AppModule is first loaded, so set the limit
    // before importing anything that pulls it in.
    process.env.AUTH_RATE_LIMIT = '3';
    // require, not import(): Jest runs these files as CommonJS.
    const { createTestApp } = jest.requireActual<TestAppModule>('./test-app');
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
    process.env.AUTH_RATE_LIMIT = previous;
  });

  it('answers 429 once an IP exceeds the limit, without touching other routes', async () => {
    const forgot = () =>
      request(t.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'someone@tek-up.de' });

    for (let i = 0; i < 3; i++) await forgot().expect(202);
    const limited = await forgot().expect(429);
    expect(limited.headers['content-type']).toMatch(/application\/problem\+json/);
    await request(t.app.getHttpServer()).get('/certifications').expect(200);
  });
});
