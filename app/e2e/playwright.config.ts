import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against production builds: the API from backend/dist and the frontend from its
 * standalone bundle, each started as its own process, as they will run on separate EC2 instances.
 * Run `pnpm build` first. Requires Postgres and Mailpit (pnpm db:up); tests use the tekcert_test
 * database and read emails from Mailpit's API.
 */

const API_PORT = 4010;
const WEB_PORT = 3010;
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://tekcert:tekcert@localhost:5432/tekcert_test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Each test signs up (argon2) and runs a browser next to both servers: keep the machine responsive.
  workers: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  // Sign-up, email delivery and verification take a few round trips.
  expect: { timeout: 10_000 },
  projects: [
    { name: 'setup', testMatch: /warmup\.setup\.ts$/ },
    {
      name: 'desktop',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: [
    {
      name: 'api',
      command:
        'pnpm --filter backend db:deploy && pnpm --filter backend db:seed:deploy && pnpm --filter backend start',
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: {
        DATABASE_URL,
        PORT: String(API_PORT),
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        JWT_ACCESS_SECRET: 'e2e-secret-that-is-at-least-32-characters',
        WEB_URL: `http://127.0.0.1:${WEB_PORT}`,
        // The test servers run over plain HTTP.
        COOKIE_SECURE: 'false',
        SMTP_URL: process.env.SMTP_URL ?? 'smtp://127.0.0.1:1025',
        // Every test signs up from the same IP.
        AUTH_RATE_LIMIT: '1000',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: 'web',
      command: 'pnpm --filter frontend deploy:bundle && node ../deploy/frontend/frontend/server.js',
      url: `http://127.0.0.1:${WEB_PORT}/healthz`,
      env: {
        PORT: String(WEB_PORT),
        HOSTNAME: '127.0.0.1',
        API_URL: `http://127.0.0.1:${API_PORT}`,
        NODE_ENV: 'production',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
