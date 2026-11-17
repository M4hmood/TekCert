import { expect, test } from '@playwright/test';

const isPhone = (width: number | undefined) => (width ?? 0) < 768;

test('a visitor reads the landing page and goes on to sign up', async ({ page, viewport }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Earn the IT certifications that count.',
  );

  // Real totals from the API, never a name.
  const numbers = page.getByRole('region', { name: 'TekCert in numbers' });
  await expect(numbers).toContainText('certifications in the catalog');
  await expect(numbers).toContainText('56');
  await expect(page.getByText('56 certifications · 10 providers')).toBeVisible();
  const providers = page.getByRole('region', { name: 'Funded certifications by provider' });
  await expect(providers.getByRole('article')).toHaveCount(10);
  await expect(
    // One card per path; each card lists its own steps inside.
    page
      .getByRole('region', { name: /One path per specialty/ })
      .locator('ul')
      .first()
      .locator(':scope > li'),
  ).toHaveCount(7);

  if (!isPhone(viewport?.width)) {
    // The header's section links scroll to the sections.
    await page
      .getByRole('navigation', { name: 'Sections' })
      .getByRole('link', { name: 'Paths' })
      .click();
    await expect(page).toHaveURL(/#paths$/);
    await expect(page.getByRole('heading', { name: /One path per specialty/ })).toBeInViewport();
  }

  await page.getByRole('link', { name: /Sign up with/ }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
});

test('the full catalog link asks a visitor to sign in first', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Full catalog/ }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcatalog$/);
});

test('the status check answers for all three tiers', async ({ request }) => {
  const res = await request.get('/status');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok', web: 'ok', api: 'ok', database: 'ok' });
  expect(res.headers()['cache-control']).toBe('no-store');
});
