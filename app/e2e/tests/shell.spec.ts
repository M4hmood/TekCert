import { expect, type Page, test } from '@playwright/test';

/** Every MVP screen reachable from the navigation, with the heading it should show. */
const SIDEBAR_ROUTES = [
  { link: 'Dashboard', path: '/dashboard', heading: 'Dashboard' },
  { link: 'Catalog', path: '/catalog', heading: 'Catalog' },
  { link: 'Paths', path: '/paths', heading: 'Paths' },
  { link: 'Community', path: '/community', heading: 'Community' },
  { link: 'Leaderboard', path: '/leaderboard', heading: 'Leaderboard' },
  { link: 'My profile', path: '/profile', heading: 'My profile' },
  { link: 'My requests', path: '/requests', heading: 'My requests' },
  { link: 'Notifications', path: '/notifications', heading: 'Notifications' },
  { link: 'Settings', path: '/settings', heading: 'Settings' },
];

const BOTTOM_TABS = [
  { link: 'Home', path: '/dashboard', heading: 'Dashboard' },
  { link: 'Catalog', path: '/catalog', heading: 'Catalog' },
  { link: 'Paths', path: '/paths', heading: 'Paths' },
  { link: 'Community', path: '/community', heading: 'Community' },
  { link: 'Profile', path: '/profile', heading: 'My profile' },
];

const heading = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('desktop shell', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'sidebar layout only');

  test('opens the dashboard from the root URL', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(heading(page)).toHaveText('Dashboard');
  });

  test('reaches every screen through the sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary');
    for (const route of SIDEBAR_ROUTES) {
      const link = sidebar.getByRole('link', { name: route.link, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(heading(page)).toHaveText(route.heading);
      await expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  test('remembers the collapsed sidebar across reloads', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Collapse menu' }).click();
    await page.reload();
    await expect(page.getByRole('complementary')).toHaveAttribute('data-collapsed', 'true');
    await expect(page.getByRole('button', { name: 'Expand menu' })).toBeVisible();
  });
});

test.describe('mobile shell', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'bottom nav layout only');

  test('uses the bottom navigation instead of the sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('complementary')).toBeHidden();
    const tabs = page.getByRole('navigation', { name: 'Main navigation' }).last();
    for (const tab of BOTTOM_TABS) {
      await tabs.getByRole('link', { name: tab.link }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.path}$`));
      await expect(heading(page)).toHaveText(tab.heading);
    }
  });
});

test('theme toggle switches to dark and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/dashboard');
  const html = page.locator('html');
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  const light = await background();
  await page.getByRole('button', { name: 'Change theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await background()).not.toBe(light);

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('screens outside the shell render without navigation', async ({ page }) => {
  for (const path of ['/sign-in', '/onboarding']) {
    await page.goto(path);
    await expect(heading(page)).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
  }
});

test('unknown pages show the not-found screen', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test.describe('catalog wiring', () => {
  test('the seeded catalog is served through the /api proxy', async ({ request }) => {
    const res = await request.get('/api/certifications');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(44);
  });

  test('the catalog and certification pages read from the API', async ({ page }) => {
    await page.goto('/catalog');
    await expect(
      page.getByText('44 certifications funded by the institute are ready.'),
    ).toBeVisible();

    await page.goto('/catalog/saa-c03');
    await expect(heading(page)).toHaveText('AWS Certified Solutions Architect – Associate');
    await expect(page.getByText(/11 chapters across 4 exam domains/)).toBeVisible();
  });
});
