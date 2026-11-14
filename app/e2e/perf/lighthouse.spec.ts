import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect, type Page, test } from '@playwright/test';
import { completeOnboarding, signInNewStudent } from '../tests/support';

/**
 * Lighthouse on a phone profile against the production build (S08 budgets): Performance 90 or
 * more and Accessibility 100 on the landing page, the catalog and the dashboard. It downloads
 * the Lighthouse CLI on first use, so it needs the network; run with
 * `pnpm --filter e2e test:perf -g lighthouse`.
 */
const BUDGET = { performance: 0.9, accessibility: 1 };
const OUT = path.join(__dirname, '..', 'test-results', 'lighthouse');

interface Report {
  categories: Record<'performance' | 'accessibility', { score: number }>;
  audits: Record<string, { score: number | null; title: string; scoreDisplayMode: string }>;
}

function audit(url: string, name: string, cookie?: string): Report {
  mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.json`);
  // Headers go through a file: a JSON argument doesn't survive the Windows shell.
  const headers = path.join(OUT, `${name}.headers.json`);
  writeFileSync(headers, JSON.stringify(cookie ? { Cookie: cookie } : {}));
  const args = [
    'dlx',
    'lighthouse@12',
    url,
    '--quiet',
    '--only-categories=performance,accessibility',
    '--output=json',
    `--output-path=${file}`,
    '--chrome-flags=--headless=new --no-sandbox',
    `--extra-headers=${headers}`,
  ];
  execFileSync('pnpm', args, {
    env: { ...process.env, CHROME_PATH: chromium.executablePath() },
    stdio: 'pipe',
    shell: true,
  });
  return JSON.parse(readFileSync(file, 'utf8')) as Report;
}

function check(name: string, report: Report) {
  const { performance, accessibility } = report.categories;
  const failed = Object.values(report.audits)
    .filter((item) => item.scoreDisplayMode === 'binary' && item.score === 0)
    .map((item) => item.title);
  console.log(
    `[lighthouse] ${name}: performance ${Math.round(performance.score * 100)}, accessibility ${Math.round(accessibility.score * 100)}${failed.length ? ` · failed: ${failed.join('; ')}` : ''}`,
  );
  expect.soft(performance.score, `${name}: performance`).toBeGreaterThanOrEqual(BUDGET.performance);
  expect
    .soft(accessibility.score, `${name}: accessibility`)
    .toBeGreaterThanOrEqual(BUDGET.accessibility);
}

async function cookieHeader(page: Page): Promise<string> {
  return (await page.context().cookies()).map(({ name, value }) => `${name}=${value}`).join('; ');
}

test.describe('lighthouse', () => {
  test.describe.configure({ timeout: 300_000 });

  test('landing page', ({ baseURL }) => {
    check('landing', audit(`${baseURL}/`, 'landing'));
    // The same page once the splash has played this session, to tell the two apart.
    check('landing, splash seen', audit(`${baseURL}/`, 'landing-seen', 'splash_seen=1'));
  });

  test('catalog and dashboard', async ({ page, baseURL }) => {
    await signInNewStudent(page);
    await completeOnboarding(page.request);
    // The splash plays once per browser session; a returning student doesn't see it.
    const cookie = `${await cookieHeader(page)}; splash_seen=1`;
    check('catalog', audit(`${baseURL}/catalog`, 'catalog', cookie));
    check('dashboard', audit(`${baseURL}/dashboard`, 'dashboard', cookie));
  });
});
