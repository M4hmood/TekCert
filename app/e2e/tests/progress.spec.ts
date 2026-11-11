import { expect, type Page, test } from '@playwright/test';
import { signInOnboardedStudent } from './support';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** The visible level card: the dark strip on phones, the hero card on desktop. */
const levelCard = (page: Page) =>
  page.getByRole('region', { name: 'My level' }).locator('visible=true');

test('a new student starts from the empty dashboard and ticks a first chapter', async ({
  page,
}) => {
  await signInOnboardedStudent(page);
  await page.goto('/dashboard');

  await expect(page.getByText('Welcome to TekCert')).toBeVisible();
  await expect(page.getByText('Finish a chapter to earn your first 10 points')).toBeVisible();
  const start = page.getByRole('region', { name: 'Get started' });
  await expect(start).toContainText('Your path · CIM');
  await expect(start).toContainText('Start with AWS Certified Cloud Practitioner');
  await start.getByRole('button', { name: 'Start' }).click();

  const current = page.getByRole('region', { name: 'Current certification' });
  await expect(current).toContainText('AWS Certified Cloud Practitioner');
  const first = current.getByRole('checkbox').first();
  await expect(first).toHaveAttribute('aria-checked', 'false');
  await first.click();
  await expect(first).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('status')).toContainText(
    'Chapter done · +10 points · First step badge earned',
  );
  await expect(levelCard(page)).toContainText('10');
  await expect(levelCard(page)).toContainText('240');
});

test('ticks on the certification page show on the dashboard, and classmates see them', async ({
  page,
  browser,
}) => {
  // Two students, a dozen round trips: more than the default 30 s when the suite runs in full.
  test.setTimeout(90_000);
  await signInOnboardedStudent(page);
  expect((await page.request.put('/api/me/preparations/saa-c03')).status()).toBe(201);

  await page.goto('/catalog/saa-c03?tab=syllabus');
  const status = page.getByRole('region', { name: 'My status' });
  await expect(status).toContainText('0/11 chapters');
  await page.getByRole('checkbox', { name: /Identity and access/ }).click();
  await expect(page.getByRole('status')).toContainText('Chapter done · +10 points');
  // Wait for the API before reloading: a reload would cancel the request still in flight.
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/me/chapters/') && r.request().method() === 'PUT',
  );
  await page.getByRole('checkbox', { name: /Networking: VPC/ }).click();
  expect((await saved).ok()).toBe(true);
  await expect(status).toContainText('2/11 chapters');
  await expect(status).toContainText('18%');

  // Saved: a reload keeps both ticks.
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Networking: VPC/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  await page.goto('/dashboard');
  const current = page.getByRole('region', { name: 'Current certification' });
  await expect(current).toContainText('AWS Certified Solutions Architect – Associate');
  await expect(current).toContainText('18%');
  // 20 points: 230 to Bachelor.
  await expect(levelCard(page)).toContainText('230');

  // Untick from the dashboard, then undo the untick.
  await current.getByRole('checkbox', { name: /Networking: VPC/ }).click();
  await expect(page.getByRole('status')).toContainText('Chapter unticked · −10 points');
  await expect(levelCard(page)).toContainText('240');
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('status')).toContainText('Chapter done · +10 points');
  await expect(levelCard(page)).toContainText('230');

  // A classmate of the same specialty sees the roll-up, and the percentage under "Preparing it".
  const me = (await page.request.get('/api/auth/me').then((r) => r.json())) as {
    id: string;
    email: string;
  };
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await signInOnboardedStudent(otherPage);
  // Not a new student, so the dashboard is the filled one (phones hide the feed when empty).
  expect((await otherPage.request.put('/api/me/preparations/az-900')).status()).toBe(201);
  // Other tests run alongside and fill the same feed, so look the line up by student id.
  const feed = (await otherPage.request
    .get('/api/activity?scope=specialty')
    .then((r) => r.json())) as {
    items: { kind: string; count: number | null; person: { id: string } }[];
  };
  expect(
    feed.items.find((item) => item.person.id === me.id && item.kind === 'chapters_done')?.count,
  ).toBe(2);
  await otherPage.goto('/dashboard');
  await expect(
    otherPage.getByRole('region', { name: 'Classmate activity' }).getByRole('listitem').first(),
  ).toBeVisible();
  await otherPage.goto('/catalog/saa-c03?tab=community&scope=class');
  const row = otherPage
    .getByRole('region', { name: 'Preparing it' })
    .getByRole('listitem')
    .filter({ has: otherPage.locator(`a[href="mailto:${me.email}"]`) });
  await expect(row).toContainText('18%');
  await other.close();
});

test('the profile shows the level and the badges', async ({ page }) => {
  await signInOnboardedStudent(page);
  await page.goto('/profile');
  const level = page.getByRole('region', { name: 'My level' });
  await expect(level).toContainText('Level I');
  await expect(level).toContainText('Novice');
  await expect(level).toContainText('250 points to Bachelor');
  await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible();
  await expect(page.getByText('0 of 5')).toBeVisible();
  if (!isPhone(page)) await expect(page.getByText('Dedicated', { exact: false })).toBeVisible();
});
