import { randomUUID } from 'node:crypto';
import { type Browser, expect, type Page, test } from '@playwright/test';
import { completeOnboarding, signInNewStudent, uniqueEmail } from './support';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/**
 * No other test uses these classes, and the desktop and phone runs each get their own, so a
 * class board only holds the students of this file.
 */
const classFor = (page: Page, specialty: 'DMWM' | 'SDIA') => ({
  year: 5,
  specialty,
  group: isPhone(page) ? 'D' : 'C',
});
const family = () =>
  `Zq${randomUUID()
    .replace(/[^a-z]/g, '')
    .slice(0, 10)}`;

/** Starts AZ-900 and ticks its first `count` chapters for the student signed in on `page`. */
async function earn(page: Page, count: number) {
  expect((await page.request.put('/api/me/preparations/az-900')).ok()).toBe(true);
  const detail = (await page.request.get('/api/certifications/az-900').then((r) => r.json())) as {
    domains: { chapters: { id: string; order: number }[] }[];
  };
  const ids = detail.domains
    .flatMap((d) => d.chapters)
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id);
  for (const id of ids.slice(0, count)) {
    expect((await page.request.put(`/api/me/chapters/${id}`)).ok()).toBe(true);
  }
}

/** Another student of the same class, in their own browser session. */
async function classmate(
  browser: Browser,
  page: Page,
  names: { firstName: string; lastName: string },
  enrolment: ReturnType<typeof classFor>,
  chapters: number,
) {
  const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const other = await context.newPage();
  await signInNewStudent(other, uniqueEmail(), names);
  await completeOnboarding(other.request, [], enrolment);
  await earn(other, chapters);
  return { page: other, close: () => context.close() };
}

test('ranks my class on the points earned and shows my position', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const klass = classFor(page, 'DMWM');
  const lastName = family();
  const rania = await classmate(browser, page, { firstName: 'Rania', lastName }, klass, 3);
  await rania.close();
  await signInNewStudent(page, uniqueEmail(), { firstName: 'Yassine', lastName });
  await completeOnboarding(page.request, [], klass);
  await earn(page, 2);

  await page.goto('/leaderboard?scope=class');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leaderboard');
  const table = page.getByRole('table', { name: 'Student leaderboard' });
  const mine = table.getByRole('row').filter({ hasText: `You · Yassine ${lastName}` });
  await expect(mine).toHaveAttribute('aria-current', 'true');
  await expect(mine).toContainText('20');
  // She has one chapter more, so she is ahead of me.
  const hers = table.getByRole('row').filter({ hasText: `Rania ${lastName}` });
  await expect(hers).toContainText('30');
  const rows = await table.getByRole('row').allTextContents();
  expect(rows.findIndex((text) => text.includes(`Rania ${lastName}`))).toBeLessThan(
    rows.findIndex((text) => text.includes(`Yassine ${lastName}`)),
  );

  if (isPhone(page)) {
    // My row stays pinned above the tab bar.
    const pinned = page.getByRole('group', { name: 'Your row' });
    await expect(pinned).toBeVisible();
    await expect(pinned).toContainText('20');
  } else {
    const position = page.getByRole('region', { name: 'Your position' });
    await expect(position).toContainText('10 points behind Rania.');
    await expect(position.getByRole('link', { name: 'Continue AZ-900' })).toHaveAttribute(
      'href',
      '/catalog/az-900?tab=syllabus',
    );
    // A name opens the student's profile.
    await hers.getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Rania ${lastName}`);
    await page.goBack();
  }

  // The period is kept in the URL; all my points were earned this month.
  await page.getByRole('combobox', { name: /Period/ }).click();
  await page.getByRole('option', { name: 'All time' }).click();
  await expect(page).toHaveURL(/\/leaderboard\?scope=class&period=all$/);
  await expect(mine).toContainText('20');
});

test('a student who hides their name is ranked as Anonymous', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const klass = classFor(page, 'SDIA');
  const lastName = family();
  const hidden = await classmate(browser, page, { firstName: 'Ines', lastName }, klass, 3);

  // She switches her name off from her own profile.
  await hidden.page.goto('/leaderboard?scope=class&period=all');
  if (!isPhone(page)) {
    await hidden.page.getByRole('link', { name: 'Hide my name from the leaderboard' }).click();
    await expect(hidden.page).toHaveURL(/\/profile#privacy$/);
  } else {
    await hidden.page.goto('/profile');
  }
  const visible = hidden.page.getByRole('switch', { name: 'Appear on the leaderboard' });
  await expect(visible).toBeChecked();
  await visible.click();
  await expect(hidden.page.getByRole('status')).toContainText(
    'You now appear as Anonymous on the leaderboard',
  );
  await expect(hidden.page.getByText('Anonymous on leaderboard')).toBeVisible();

  // She still sees herself, and is told how others see her.
  await hidden.page.goto('/leaderboard?scope=class&period=all');
  const own = hidden.page.getByRole('table', { name: 'Student leaderboard' });
  await expect(own.getByRole('row').filter({ hasText: `You · Ines ${lastName}` })).toBeVisible();
  await expect(
    hidden.page.getByText(isPhone(page) ? 'Anonymous to others' : 'Others see you as Anonymous.'),
  ).toBeVisible();
  await hidden.close();

  // A classmate sees an Anonymous row with her points, and her name nowhere.
  await signInNewStudent(page, uniqueEmail(), { firstName: 'Mehdi', lastName: family() });
  await completeOnboarding(page.request, [], klass);
  await page.goto('/leaderboard?scope=class&period=all');
  const table = page.getByRole('table', { name: 'Student leaderboard' });
  const anonymous = table.getByRole('row').filter({ hasText: 'Anonymous' }).first();
  await expect(anonymous).toContainText('30');
  await expect(anonymous.getByRole('link')).toHaveCount(0);
  await expect(page.getByText(lastName)).toHaveCount(0);
});

test('switches to the specialties board and marks mine', async ({ page }) => {
  await signInNewStudent(page);
  await completeOnboarding(page.request);
  await page.goto('/leaderboard');
  await page
    .getByRole('group', { name: 'View' })
    .locator('visible=true')
    .getByRole('button', { name: 'Specialties' })
    .click();
  await expect(page).toHaveURL(/\/leaderboard\?view=specialties$/);
  const board = page.getByRole('region', { name: 'Specialty leaderboard' });
  await expect(board.getByText('Average points per student · all years')).toBeVisible();
  // Signed up in ING-4 CIM.
  await expect(board.getByRole('listitem').filter({ hasText: '· yours' })).toContainText('CIM');
  await expect(page.getByRole('group', { name: 'Scope' })).toHaveCount(0);

  // A shared link opens on the same board.
  await page.goto('/leaderboard?view=specialties&period=all');
  await expect(board.getByRole('listitem').filter({ hasText: '· yours' })).toContainText('CIM');
  await expect(page.getByRole('combobox', { name: /Period/ })).toContainText('All time');
});
