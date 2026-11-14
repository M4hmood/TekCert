import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Download budgets: what a first visit to each screen transfers (perf/transfer.spec.ts).
 * Local and manual, like the visual run: `pnpm build`, then `pnpm --filter e2e test:perf`.
 */
export default defineConfig({
  ...base,
  testDir: './perf',
  outputDir: './test-results/perf',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
