import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { PASSWORD, signInNewStudent, uniqueEmail } from '../tests/support';
import { shot, STUDENT_FILE } from './shared';

const PHOTO = path.join(__dirname, '..', 'tests', 'fixtures', 'photo.png');
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;
const BASE_URL = 'http://127.0.0.1:3010';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'splash_seen', value: '1', url: BASE_URL }]);
});

test.describe('signed out', () => {
  test('splash frames', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name.endsWith('dark'), 'the splash has one look');
    await context.clearCookies();
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-splash] img').evaluate((img: HTMLImageElement) => img.decode());
    // Frozen at set moments of the timeline, so the frames are the same on every run.
    for (const time of [500, 1000, 1200, 1500, 2100, 2300]) {
      await page.evaluate((at) => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = at;
        }
      }, time);
      await expect.soft(page).toHaveScreenshot(`splash-${time}.png`, { animations: 'allow' });
    }
  });

  test('auth screens', async ({ page }) => {
    await page.goto('/sign-in');
    await shot(page, 'sign-in');

    await page.getByLabel('Institute email').focus();
    await shot(page, 'sign-in-focus');

    await page.getByLabel('Institute email').fill('no.such.student@tek-up.de');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await shot(page, 'sign-in-error');

    await page.goto('/sign-up');
    await shot(page, 'sign-up');
    await page.getByLabel('First name').fill('Yassine');
    await page.getByLabel('Institute email', { exact: true }).fill('a.student@tek-up.de');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create my account' }).click();
    await shot(page, 'sign-up-errors');

    await page.goto('/forgot-password');
    await shot(page, 'forgot-password');
    await page.goto('/reset-password');
    await shot(page, 'reset-password');
    await page.goto('/verify-email');
    await shot(page, 'verify-email');
  });
});

test.describe('onboarding', () => {
  test('steps', async ({ page }) => {
    await signInNewStudent(page, uniqueEmail('visual'));
    await page.goto('/onboarding');
    await shot(page, 'onboarding-1-year');
    await page.getByRole('button', { name: /ING-4/ }).click();
    await shot(page, 'onboarding-1-year-selected');
    await page.getByRole('button', { name: /^Continue/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What’s your specialty?');
    await shot(page, 'onboarding-2-specialty');
    await page.getByRole('button', { name: /^CIM/ }).click();
    await page.getByRole('button', { name: 'Group C' }).click();
    await shot(page, 'onboarding-2-specialty-selected');
    await page.getByRole('button', { name: /^Continue/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Do you already have certifications?',
    );
    await shot(page, 'onboarding-3-certifications');
    await page.getByRole('searchbox', { name: 'Search for a certification' }).fill('practitioner');
    await page.getByRole('button', { name: /AWS Certified Cloud Practitioner/ }).click();
    await shot(page, 'onboarding-3-certifications-selected');
    // Unselected again: a declared certification would change the counts on later screens.
    await page.getByRole('button', { name: /AWS Certified Cloud Practitioner/ }).click();
    await page.getByRole('button', { name: 'Skip this step' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Add a profile photo');
    await shot(page, 'onboarding-4-photo');
    await page.getByLabel('Profile photo file').setInputFiles(PHOTO);
    await expect(page.getByRole('dialog', { name: 'Crop your photo' })).toBeVisible();
    await shot(page, 'onboarding-4-photo-crop');
  });

  test('target specialty below ING-4', async ({ page }) => {
    await signInNewStudent(page, uniqueEmail('visual'));
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /ING-3/ }).click();
    await page.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: /^SSIR/ }).click();
    await page.getByRole('button', { name: 'Group B' }).click();
    await shot(page, 'onboarding-2-target-specialty');
  });

  test.describe('result', () => {
    test.use({ storageState: STUDENT_FILE('result') });
    test('recommended path', async ({ page }) => {
      await page.goto('/onboarding');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Here’s your recommended path',
      );
      await shot(page, 'onboarding-5-result');
    });
  });
});

test.describe('signed in', () => {
  test.use({ storageState: STUDENT_FILE('main') });

  test('placeholder screens', async ({ page }) => {
    for (const route of [
      'paths',
      'community',
      'leaderboard',
      'requests',
      'notifications',
      'settings',
    ]) {
      await page.goto(`/${route}`);
      await shot(page, route);
    }
  });

  test('dashboard and profile', async ({ page }) => {
    await page.goto('/dashboard');
    await shot(page, 'dashboard');
    await page.goto('/profile');
    await shot(page, 'profile');
  });

  test('not found', async ({ page }) => {
    await page.goto('/catalog/no-such-certification');
    await shot(page, 'not-found');
  });

  test('catalog', async ({ page }) => {
    const routes = {
      catalog: '',
      'catalog-page-2': '?page=2',
      'catalog-filtered': '?provider=AWS,AZURE&level=associate&specialty=CIM&sort=name',
      'catalog-no-results': '?q=zzzz',
      'catalog-no-matches': '?provider=REDHAT&maxDifficulty=3',
    };
    for (const [name, search] of Object.entries(routes)) {
      await page.goto(`/catalog${search}`);
      await shot(page, name);
    }

    await page.goto('/catalog');
    const sort = page.getByRole('combobox').first();
    if (await sort.isVisible()) {
      await sort.click();
      await expect(page.getByRole('listbox')).toBeVisible();
      // Viewport only: a full-page capture resizes the window, which closes the list.
      await expect.soft(page).toHaveScreenshot('catalog-sort-open-viewport.png');
      await page.getByRole('option', { name: 'Name A–Z' }).click();
      await expect(page.getByRole('listbox')).toBeHidden();
      await expect.soft(page).toHaveScreenshot('catalog-sort-picked-viewport.png');
    }
  });

  test('catalog filter sheet', async ({ page }) => {
    test.skip(!isPhone(page), 'phones only');
    await page.goto('/catalog');
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shot(page, 'catalog-filter-sheet');
  });

  test('loading skeletons', async ({ page }) => {
    await page.goto('/dashboard');
    // Let Next prefetch the loading screen first, or holding the requests back would block it too.
    await page.waitForLoadState('networkidle');
    // Hold the next page back so its loading screen stays up.
    await page.route(/\/catalog(\/[^?]*)?\?_rsc=/, () => undefined);
    const nav = page.getByRole(isPhone(page) ? 'navigation' : 'complementary');
    await nav.getByRole('link', { name: 'Catalog', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Loading' })).toBeVisible();
    await expect.soft(page).toHaveScreenshot('catalog-skeleton.png', { fullPage: true });

    await page.unroute(/\/catalog(\/[^?]*)?\?_rsc=/);
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');
    await page.route(/\/dashboard\?_rsc=/, () => undefined);
    await nav
      .getByRole('link', { name: isPhone(page) ? 'Home' : 'Dashboard', exact: true })
      .click();
    await expect(page.getByRole('status', { name: 'Loading your dashboard' })).toBeVisible();
    await expect.soft(page).toHaveScreenshot('dashboard-skeleton.png', { fullPage: true });
  });

  test('certification page', async ({ page }) => {
    const routes = {
      'cert-in-progress-overview': '/catalog/saa-c03',
      'cert-syllabus': '/catalog/saa-c03?tab=syllabus',
      'cert-resources': '/catalog/saa-c03?tab=resources',
      'cert-community': '/catalog/saa-c03?tab=community',
      'cert-community-class': '/catalog/saa-c03?tab=community&scope=class',
      'cert-community-empty': '/catalog/az-900?tab=community',
      'cert-held': '/catalog/clf-c02',
      'cert-available': '/catalog/az-900',
      'cert-no-badge': '/catalog/rhcsa',
    };
    for (const [name, route] of Object.entries(routes)) {
      await page.goto(route);
      await shot(page, name);
    }
  });

  test('collapsed sidebar', async ({ page, context }) => {
    test.skip(isPhone(page), 'sidebar only');
    await context.addCookies([{ name: 'sidebar', value: 'collapsed', url: BASE_URL }]);
    await page.goto('/catalog');
    await shot(page, 'sidebar-collapsed');
  });

  test('theme forced against the OS', async ({ page, context }) => {
    const osIsDark = await page.evaluate(
      () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    await context.addCookies([
      { name: 'theme', value: osIsDark ? 'light' : 'dark', url: BASE_URL },
    ]);
    await page.goto('/catalog');
    await shot(page, 'theme-forced');
    await page.goto('/catalog/saa-c03');
    await shot(page, 'theme-forced-certification');
  });

  test('widths between the breakpoints', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-light', 'one run is enough');
    for (const width of [1250, 1150, 1050, 900, 600]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/catalog');
      await shot(page, `width-${width}-catalog`);
      await page.goto('/catalog/saa-c03');
      await shot(page, `width-${width}-certification`);
    }
  });
});

test.describe('new student', () => {
  test.use({ storageState: STUDENT_FILE('fresh') });

  test('empty dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await shot(page, 'dashboard-empty');
  });
});

test.describe('widths on signed-out screens', () => {
  test('sign-in', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-light', 'one run is enough');
    for (const width of [1250, 900, 600, 460]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/sign-in');
      await shot(page, `width-${width}-sign-in`);
    }
  });

  test('onboarding', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-light', 'one run is enough');
    await signInNewStudent(page, uniqueEmail('visual'));
    for (const width of [1050, 900, 600]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/onboarding');
      await shot(page, `width-${width}-onboarding`);
    }
  });
});
