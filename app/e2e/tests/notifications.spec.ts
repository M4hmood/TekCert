import { type Browser, expect, type Page, test } from '@playwright/test';
import { completeOnboarding, emailWithSubject, signInNewStudent, uniqueEmail } from './support';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/**
 * No other test uses these classes, and the desktop and phone runs each get their own, so
 * "classmates" are exactly the students of one test.
 */
const classFor = (page: Page, group: 'A' | 'B') => ({
  year: 5,
  specialty: 'AIOT',
  group: isPhone(page) ? (group === 'A' ? 'C' : 'D') : group,
});

/** Ticks the first chapter of AZ-900 for the student signed in on `page`. */
async function tickFirstChapter(page: Page) {
  expect((await page.request.put('/api/me/preparations/az-900')).ok()).toBe(true);
  const detail = (await page.request.get('/api/certifications/az-900').then((r) => r.json())) as {
    domains: { chapters: { id: string; order: number }[] }[];
  };
  const [first] = detail.domains.flatMap((d) => d.chapters).sort((a, b) => a.order - b.order);
  expect((await page.request.put(`/api/me/chapters/${first?.id ?? ''}`)).ok()).toBe(true);
}

/** Another student of the same class who starts a certification, in their own session. */
async function classmateStarts(
  browser: Browser,
  page: Page,
  firstName: string,
  enrolment: ReturnType<typeof classFor>,
  slug: string,
) {
  const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const other = await context.newPage();
  await signInNewStudent(other, uniqueEmail(), { firstName, lastName: 'Classmate' });
  await completeOnboarding(other.request, [], enrolment);
  expect((await other.request.put(`/api/me/preparations/${slug}`)).ok()).toBe(true);
  await context.close();
}

test('tells me about my first badge, in the app and by email, until I read it', async ({
  page,
}) => {
  const email = await signInNewStudent(page);
  await completeOnboarding(page.request, [], classFor(page, 'A'));
  await tickFirstChapter(page);

  // The dashboard says something is waiting: the sidebar on desktop, the bell everywhere.
  await page.goto('/dashboard');
  const bell = page.getByRole('main').getByRole('link', { name: 'Notifications, 1 unread' });
  await expect(bell).toBeVisible();
  if (!isPhone(page)) {
    await expect(
      page.getByRole('complementary').getByRole('link', { name: /Notifications.*1 unread/ }),
    ).toBeVisible();
  }
  await bell.click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notifications');

  const today = page.getByRole('region', { name: 'Today' });
  const row = today.getByRole('button', { name: /You earned the First step badge/ });
  await expect(row).toContainText('Unread:');
  if (!isPhone(page)) {
    await expect(page.getByText('1 unread', { exact: true })).toBeVisible();
    await expect(today).toContainText('First chapter completed.');
    await expect(today.getByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      '/profile',
    );
  }

  const text = await emailWithSubject(page.request, email, 'You earned the First step badge');
  expect(text).toContain('First chapter completed.');
  expect(text).toMatch(/\/settings\/notifications/);

  // Reading it clears the count here and in the navigation, and survives a reload.
  if (isPhone(page)) {
    // On phones the row opens the screen it is about.
    await row.click();
    await expect(page).toHaveURL(/\/profile$/);
    await page.goto('/notifications');
  } else {
    await row.click();
    await expect(page.getByText('All read', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('complementary').getByRole('link', { name: 'Notifications', exact: true }),
    ).toBeVisible();
    await page.reload();
  }
  await expect(
    page
      .getByRole('region', { name: 'Today' })
      .getByRole('button', { name: /You earned the First step badge/ }),
  ).not.toContainText('Unread:');
  await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
});

test('tells me when a classmate starts the certification I prepare, and filters', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const klass = classFor(page, 'B');
  await signInNewStudent(page);
  await completeOnboarding(page.request, [], klass);
  expect((await page.request.put('/api/me/preparations/clf-c02')).ok()).toBe(true);
  await classmateStarts(browser, page, 'Mehdi', klass, 'clf-c02');
  await classmateStarts(browser, page, 'Salma', klass, 'clf-c02');

  await page.goto('/notifications');
  const today = page.getByRole('region', { name: 'Today' });
  // Two classmates the same day share one line.
  await expect(today.getByRole('listitem')).toHaveCount(1);
  await expect(today.getByRole('button')).toContainText('2 students in your class started CLF-C02');
  if (!isPhone(page)) {
    await expect(today).toContainText(
      'Mehdi and Salma are preparing the same certification as you.',
    );
    await expect(today.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/catalog/clf-c02?tab=community',
    );
  }

  // The filters live in the URL, so a reload keeps them.
  const filters = page.getByRole('group', { name: 'Filter' });
  await filters.getByRole('button', { name: 'Progress' }).click();
  await expect(page).toHaveURL(/\/notifications\?filter=progress$/);
  await expect(page.getByText('Nothing here yet')).toBeVisible();
  await page.reload();
  await expect(filters.getByRole('button', { name: 'Progress' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  await filters.getByRole('button', { name: 'Community' }).click();
  await expect(page.getByRole('region', { name: 'Today' }).getByRole('listitem')).toHaveCount(1);
  await filters.getByRole('button', { name: 'Unread · 1' }).click();
  await expect(page).toHaveURL(/\/notifications\?filter=unread$/);

  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByRole('status')).toHaveText(/All notifications marked as read/);
  await page.reload();
  await expect(page.getByText('You’re all caught up')).toBeVisible();
  await expect(page.getByText('No unread notifications.')).toBeVisible();

  // The way to the preferences.
  await page.getByRole('link', { name: 'Notification preferences' }).click();
  await expect(page).toHaveURL(/\/settings\/notifications$/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Notifications');
});
