import { expect, type Page, test } from '@playwright/test';

const splash = '[data-splash]';

// The splash only lives about 2.5 s, so these tests don't race it: only the page's code can
// remove it, and holding that code back keeps it in the page for as long as a test needs.
async function holdPageCode(page: Page, ms: number): Promise<void> {
  await page.route('**/_next/static/**/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

test('plays once per browser session, then gets out of the way', async ({ page, context }) => {
  test.setTimeout(60_000);
  const html = async () => (await page.request.get('/sign-in')).text();
  expect(await html()).toContain('data-splash');

  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
  // Well above the 2.5 s it takes: a busy machine can need nearly 20 s to load the page code.
  await expect(page.locator(splash)).not.toBeAttached({ timeout: 40_000 });
  expect((await context.cookies()).map((cookie) => cookie.name)).toContain('splash_seen');

  expect(await html()).not.toContain('data-splash');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator(splash)).not.toBeAttached();
});

test('removes itself even when the page code arrives after the animation ended', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await holdPageCode(page, 3500);
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(splash)).toBeAttached();
  await expect(page.locator(splash)).not.toBeAttached({ timeout: 30_000 });
});

test('does not block the page while it plays', async ({ page }) => {
  await holdPageCode(page, 3500);
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(splash)).toBeAttached();
  // Frozen with the backdrop covering the whole page.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = 1500;
    }
  });
  const email = page.getByRole('textbox', { name: /email/i });
  await email.click();
  await expect(email).toBeFocused();
});

test.describe('with reduced motion', () => {
  test.use({ colorScheme: 'light', contextOptions: { reducedMotion: 'reduce' } });

  test('does not show', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator(splash)).toBeHidden();
  });
});
