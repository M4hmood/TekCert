import { randomUUID } from 'node:crypto';
import { type Browser, expect, type Page, test } from '@playwright/test';
import { completeOnboarding, signInNewStudent, uniqueEmail } from './support';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/**
 * The test database keeps students from earlier runs, so each test gives its own students a
 * family name nobody else has and searches for it.
 */
const family = () =>
  `Zq${randomUUID()
    .replace(/[^a-z]/g, '')
    .slice(0, 10)}`;

/** Another onboarded student (ING-4 CIM A) in their own browser session. */
async function classmate(
  browser: Browser,
  page: Page,
  names: { firstName: string; lastName: string },
  certifications: string[] = [],
) {
  const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const other = await context.newPage();
  const email = await signInNewStudent(other, uniqueEmail(), names);
  await completeOnboarding(other.request, certifications);
  const me = (await other.request.get('/api/auth/me').then((r) => r.json())) as { id: string };
  await context.close();
  return { id: me.id, email };
}

test('finds a classmate, opens their profile and copies their email', async ({
  page,
  browser,
  context,
}) => {
  test.setTimeout(90_000);
  const lastName = family();
  const rania = await classmate(browser, page, { firstName: 'Rania', lastName }, ['clf-c02']);
  await signInNewStudent(page, uniqueEmail(), { firstName: 'Yassine', lastName });
  await completeOnboarding(page.request);

  await page.goto('/community');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Community');
  await page.getByRole('searchbox', { name: 'Search for a student' }).fill(lastName);
  const students = page.getByRole('list', { name: 'Students' });
  // Me first, then the classmate.
  await expect(students.getByRole('link')).toHaveCount(2);
  await expect(students.getByRole('link').first()).toContainText('· you');
  const card = students.getByRole('link', { name: new RegExp(`Rania ${lastName}`) });
  await expect(card).toContainText(isPhone(page) ? 'ING-4 · CLF-C02' : '1 earned · 0 in progress');
  await expect(page).toHaveURL(new RegExp(`\\?q=${lastName}$`));

  // The "Holds" filter from a shared link: she holds CLF-C02, nobody here holds AZ-900.
  await page.goto(`/community?scope=class&holds=clf-c02&q=${lastName}`);
  await expect(students.getByRole('link')).toHaveCount(1);
  await page.goto(`/community?scope=class&holds=az-900&q=${lastName}`);
  await expect(page.getByRole('heading', { name: 'Nobody matches' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).last().click();
  await expect(page).toHaveURL(/\/community\?scope=class$/);

  await page.goto(`/community?q=${lastName}`);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/community/${rania.id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Rania ${lastName}`);
  await expect(page.getByRole('region', { name: /collection/i })).toContainText('CLF-C02');
  const mail = page.locator(`a[href="mailto:${rania.email}"]`);
  await expect(mail).toBeVisible();

  if (!isPhone(page)) {
    await expect(mail).toContainText('Write to Rania');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy email' }).click();
    await expect(page.getByRole('status')).toContainText('Email copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(rania.email);
  }

  await page.getByRole('link', { name: 'Back to community' }).click();
  await expect(page).toHaveURL(/\/community$/);
});

test('"Available to help" is switched on from my profile and found by the filter', async ({
  page,
}) => {
  const lastName = family();
  await signInNewStudent(page, uniqueEmail(), { firstName: 'Mehdi', lastName });
  await completeOnboarding(page.request);

  const filtered = `/community?scope=class&help=true&q=${lastName}`;
  await page.goto(filtered);
  await expect(page.getByRole('heading', { name: 'Nobody matches' })).toBeVisible();

  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Mehdi ${lastName}`);
  await expect(page.getByText('Visible to students')).toBeVisible();
  const help = page.getByRole('switch', { name: 'Available to help' });
  await expect(help).not.toBeChecked();
  await help.click();
  await expect(page.getByRole('status')).toContainText('You now show as available to help');

  await page.goto(filtered);
  const me = page.getByRole('list', { name: 'Students' }).getByRole('link');
  await expect(me).toHaveCount(1);
  await expect(me).toHaveAccessibleName(new RegExp(`^Mehdi ${lastName} \\(you\\)`));
  // My own card opens my profile, where the switch is still on after a reload.
  await me.click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('switch', { name: 'Available to help' })).toBeChecked();
});

test('a profile that cannot be opened says so', async ({ page }) => {
  await signInNewStudent(page);
  await completeOnboarding(page.request);
  await page.goto(`/community/${randomUUID()}`);
  await expect(page.getByRole('heading', { name: 'This student can’t be found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to community' }).click();
  await expect(page).toHaveURL(/\/community$/);

  await page.goto('/community/not-an-id');
  await expect(page.getByRole('heading', { name: 'This student can’t be found' })).toBeVisible();
});
