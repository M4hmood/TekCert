import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { completeOnboarding, expireAcademicYear, signInNewStudent } from './support';

/**
 * WCAG 2.1 AA with axe on every screen and its main states, in light and dark, at the size of
 * the project (1440 or 390 px). The S08 budget is no violation at all.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function checkAxe(page: Page, name: string) {
  // Animations (the splash, toasts) settle first, or contrast is read mid-fade.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes
        .slice(0, 4)
        .map((node) => node.target.join(' '))
        .join('\n    ')}`,
  );
  expect.soft(report, `${name}: accessibility violations`).toEqual([]);
}

async function inBothThemes(page: Page, name: string, open: () => Promise<void>) {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await open();
    await checkAxe(page, `${name} (${scheme})`);
  }
}

test.beforeEach(async ({ context, baseURL }) => {
  // The splash plays once per session and only covers the page visually.
  await context.addCookies([{ name: 'splash_seen', value: '1', url: baseURL ?? '' }]);
});

test('signed-out screens', async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of [
    '/',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/no-such-page',
  ]) {
    await inBothThemes(page, path, () => page.goto(path).then(() => undefined));
  }
  // An error shown inline in the form.
  await inBothThemes(page, '/sign-in with an error', async () => {
    await page.goto('/sign-in');
    await page.getByLabel('Institute email').fill('someone@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});

test('onboarding', async ({ page }) => {
  test.setTimeout(120_000);
  await signInNewStudent(page);
  await inBothThemes(page, 'onboarding, year', () =>
    page.goto('/onboarding').then(() => undefined),
  );
  await inBothThemes(page, 'onboarding, specialty', async () => {
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /ING-4/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: /^CIM/ })).toBeVisible();
  });
});

test('app screens', async ({ page }) => {
  test.setTimeout(240_000);
  await signInNewStudent(page);
  await completeOnboarding(page.request, ['clf-c02']);
  expect((await page.request.put('/api/me/preparations/saa-c03')).ok()).toBe(true);

  const screens = [
    '/dashboard',
    '/catalog',
    '/catalog?q=zzzz',
    '/catalog/saa-c03',
    '/catalog/saa-c03?tab=syllabus',
    '/catalog/saa-c03?tab=resources',
    '/catalog/saa-c03?tab=community',
    '/paths',
    '/community',
    '/leaderboard',
    '/leaderboard?view=specialties',
    '/profile',
    '/requests',
    '/notifications',
    '/settings',
    '/settings/account',
    '/settings/enrolment',
    '/settings/privacy',
    '/settings/notifications',
    '/settings/appearance',
  ];
  for (const path of screens) {
    await inBothThemes(page, path, () => page.goto(path).then(() => undefined));
  }
});

test('dialogs and sheets', async ({ page }) => {
  test.setTimeout(120_000);
  const email = await signInNewStudent(page);
  await completeOnboarding(page.request);
  expireAcademicYear(email);
  await inBothThemes(page, 'year prompt', async () => {
    await page.goto('/dashboard');
    await expect(page.getByRole('dialog')).toBeVisible();
  });
  // Put the prompt off for the day, then check a toast.
  await page.getByRole('dialog').getByRole('button', { name: 'Remind me tomorrow' }).click();
  await inBothThemes(page, 'toast', async () => {
    await page.goto('/settings/privacy');
    await page.getByRole('switch', { name: 'Available to help' }).click();
    await expect(page.getByRole('status')).toBeVisible();
  });
});

/** Tap areas under 44 px on a screen, as "role 'name' (w×h)". Inline text links are exempt. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44;
    const controls = document.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type=hidden]), select, [role=switch], [role=radio], [role=tab], [role=checkbox], [role=combobox]',
    );
    const small: string[] = [];
    for (const el of controls) {
      const style = getComputedStyle(el);
      if (style.display === 'inline' || style.visibility === 'hidden') continue;
      // Native inputs that Radix keeps out of sight and out of reach behind its own control.
      if (el.closest('[aria-hidden="true"]') || style.pointerEvents === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Hidden from the screen on purpose, e.g. "Skip to content" until focused.
      if (rect.bottom < 0 || rect.right < 0) continue;
      // A tap area can be widened invisibly by an absolutely placed ::after (the switches).
      const after = getComputedStyle(el, '::after');
      let width = rect.width;
      let height = rect.height;
      if (after.content !== 'none' && after.position === 'absolute') {
        const grow = (start: string, end: string) =>
          -Math.min(0, parseFloat(start) || 0) - Math.min(0, parseFloat(end) || 0);
        width += grow(after.left, after.right);
        height += grow(after.top, after.bottom);
      }
      // A control inside a bigger label shares its tap area (checkbox rows).
      const label = el.closest('label');
      if (label) {
        const box = label.getBoundingClientRect();
        width = Math.max(width, box.width);
        height = Math.max(height, box.height);
      }
      if (width + 0.5 < MIN || height + 0.5 < MIN) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        small.push(
          `${el.getAttribute('role') ?? el.tagName.toLowerCase()} '${name}' (${Math.round(width)}×${Math.round(height)})`,
        );
      }
    }
    return [...new Set(small)];
  });
}

test('tap areas are at least 44 px on a phone', async ({ page, isMobile, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 768, 'phones only');
  test.setTimeout(180_000);
  void isMobile;
  const report: Record<string, string[]> = {};
  for (const path of ['/', '/sign-in', '/sign-up']) {
    await page.goto(path);
    report[path] = await smallTargets(page);
  }
  await signInNewStudent(page);
  await completeOnboarding(page.request, ['clf-c02']);
  expect((await page.request.put('/api/me/preparations/saa-c03')).ok()).toBe(true);
  for (const path of [
    '/dashboard',
    '/catalog',
    '/catalog/saa-c03',
    '/catalog/saa-c03?tab=syllabus',
    '/community',
    '/leaderboard',
    '/profile',
    '/notifications',
    '/settings',
    '/settings/enrolment',
    '/settings/notifications',
    '/settings/appearance',
  ]) {
    await page.goto(path);
    report[path] = await smallTargets(page);
  }
  const failing = Object.fromEntries(Object.entries(report).filter(([, items]) => items.length));
  expect(failing).toEqual({});
});
