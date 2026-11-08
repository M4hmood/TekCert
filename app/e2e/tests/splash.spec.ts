import { expect, test } from '@playwright/test';

const splash = '[data-splash]';

test('plays once per browser session, then gets out of the way', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.locator(splash)).toBeAttached();
  await expect(page.locator(splash)).not.toBeAttached({ timeout: 8000 });

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator(splash)).not.toBeAttached();
});

test('does not block the page while it plays', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.locator(splash)).toBeAttached();
  await page.getByRole('textbox', { name: /email/i }).click({ timeout: 1000 });
  await expect(page.getByRole('textbox', { name: /email/i })).toBeFocused();
});

test.describe('with reduced motion', () => {
  test.use({ colorScheme: 'light', contextOptions: { reducedMotion: 'reduce' } });

  test('does not show', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator(splash)).toBeHidden();
  });
});
