import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { completeOnboarding, signInNewStudent } from '../tests/support';

/**
 * What a first visit downloads, with an empty cache, in bytes on the wire (compressed). Run
 * with `pnpm --filter e2e test:perf` after `pnpm build`. The budgets are the S08 numbers with
 * some room: a change that blows one of them should be a decision, not an accident.
 */
const KB = 1024;
const BUDGET = {
  /** All scripts of the first load (measured: 265 to 340 kB). */
  script: 380 * KB,
  /** Every font file: the text families and the icon subset (measured: 250 to 410 kB). */
  font: 450 * KB,
  /** Everything together, images included (measured: 0.7 to 1.1 MB; 5 to 5.9 MB before S08). */
  total: 1300 * KB,
};

type Kind = 'document' | 'script' | 'stylesheet' | 'font' | 'image' | 'other';
type Weights = Record<Kind | 'total', number>;

const kindOf = (type: string): Kind => {
  switch (type) {
    case 'Document':
      return 'document';
    case 'Script':
      return 'script';
    case 'Stylesheet':
      return 'stylesheet';
    case 'Font':
      return 'font';
    case 'Image':
      return 'image';
    default:
      return 'other';
  }
};

/** Loads `path` with an empty cache and adds up what came over the network, by kind. */
async function weigh(page: Page, path: string): Promise<Weights> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const kinds = new Map<string, Kind>();
  const urls = new Map<string, string>();
  const heavy: string[] = [];
  const weights: Weights = {
    document: 0,
    script: 0,
    stylesheet: 0,
    font: 0,
    image: 0,
    other: 0,
    total: 0,
  };
  cdp.on('Network.responseReceived', (event) => {
    kinds.set(event.requestId, kindOf(event.type));
    urls.set(event.requestId, event.response.url);
  });
  cdp.on('Network.loadingFinished', (event) => {
    const kind = kinds.get(event.requestId) ?? 'other';
    weights[kind] += event.encodedDataLength;
    weights.total += event.encodedDataLength;
    if (event.encodedDataLength > 20 * KB) {
      const url = new URL(urls.get(event.requestId) ?? 'http://unknown/');
      heavy.push(
        `${Math.round(event.encodedDataLength / KB)} kB ${kind} ${url.pathname}${url.search}`,
      );
    }
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Fonts are requested once the styles are applied.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await cdp.detach();
  // PERF_VERBOSE=1 lists what weighs the most, to see where a budget went.
  if (process.env.PERF_VERBOSE) console.log([`[perf] ${path}`, ...heavy].join(' | '));
  return weights;
}

const inKb = (weights: Weights) =>
  Object.fromEntries(
    Object.entries(weights).map(([kind, bytes]) => [kind, `${Math.round(bytes / KB)} kB`]),
  );

function check(name: string, weights: Weights) {
  // The line that goes in the sprint notes.
  console.log(`[perf] ${name}: ${JSON.stringify(inKb(weights))}`);
  expect.soft(weights.script, `${name}: scripts`).toBeLessThan(BUDGET.script);
  expect.soft(weights.font, `${name}: fonts`).toBeLessThan(BUDGET.font);
  expect.soft(weights.total, `${name}: total`).toBeLessThan(BUDGET.total);
}

test('the landing page stays within its download budget', async ({ page }) => {
  check('landing', await weigh(page, '/'));
});

test('the sign-in page stays within its download budget', async ({ page }) => {
  check('sign-in', await weigh(page, '/sign-in'));
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await signInNewStudent(page);
    await completeOnboarding(page.request);
  });

  for (const [name, path] of [
    ['dashboard', '/dashboard'],
    ['catalog', '/catalog'],
    ['certification', '/catalog/saa-c03'],
    ['notifications', '/notifications'],
    ['settings', '/settings'],
  ] as const) {
    test(`${name} stays within its download budget`, async ({ page }) => {
      check(name, await weigh(page, path));
    });
  }
});
