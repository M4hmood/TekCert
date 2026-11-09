import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Screenshots of every screen, compared with a local baseline. Local only, not in CI: font
 * rendering differs between machines. Run `pnpm build` first.
 *
 * Take the baseline:  pnpm --filter e2e test:visual --update-snapshots
 * Compare against it: pnpm --filter e2e test:visual
 *
 * Every run starts from a new database, so counts and lists are the same each time.
 */

type WebServer = Extract<NonNullable<PlaywrightTestConfig['webServer']>, unknown[]>[number];

const DATABASE_URL = 'postgresql://tekcert:tekcert@localhost:5432/tekcert_visual';
const psql = (sql: string) => `docker compose exec -T db psql -U tekcert -d postgres -c "${sql}"`;
const resetDatabase = [
  psql('DROP DATABASE IF EXISTS tekcert_visual WITH (FORCE)'),
  psql('CREATE DATABASE tekcert_visual'),
].join(' && ');

const [api, web] = base.webServer as [WebServer, WebServer];
const chrome = devices['Desktop Chrome'];
const desktop = { ...chrome, viewport: { width: 1440, height: 900 } };
const mobile = { ...chrome, viewport: { width: 390, height: 844 }, hasTouch: true };

export default defineConfig({
  ...base,
  testDir: './visual',
  outputDir: './test-results/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixels: 25, animations: 'disabled', caret: 'hide' },
  },
  use: { ...base.use, trace: 'off' },
  projects: [
    { name: 'setup', testMatch: /students\.setup\.ts$/, use: desktop },
    {
      name: 'desktop-light',
      dependencies: ['setup'],
      use: { ...desktop, colorScheme: 'light' },
    },
    { name: 'desktop-dark', dependencies: ['setup'], use: { ...desktop, colorScheme: 'dark' } },
    { name: 'mobile-light', dependencies: ['setup'], use: { ...mobile, colorScheme: 'light' } },
    { name: 'mobile-dark', dependencies: ['setup'], use: { ...mobile, colorScheme: 'dark' } },
  ],
  webServer: [
    {
      ...api,
      command: `${resetDatabase} && ${api.command}`,
      env: { ...api.env, DATABASE_URL },
      reuseExistingServer: false,
    },
    { ...web, reuseExistingServer: false },
  ],
});
