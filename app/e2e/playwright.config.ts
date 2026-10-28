import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against production builds: the API from backend/dist and the frontend from its
 * standalone bundle, each started as its own process, as they will run on separate EC2 instances.
 * Run `pnpm build` first. Requires Postgres (pnpm db:up); tests use the tekcert_test database.
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
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: [
    {
      name: 'api',
      command:
        'pnpm --filter backend db:deploy && pnpm --filter backend db:seed:deploy && pnpm --filter backend start',
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { DATABASE_URL, PORT: String(API_PORT), NODE_ENV: 'production', LOG_LEVEL: 'warn' },
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
