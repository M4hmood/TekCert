import { expect, type Page, test } from '@playwright/test';
import { signInOnboardedStudent } from './support';

const resultCount = (page: Page) => page.getByText(/^\d+ certifications?$/);
const cards = (page: Page) =>
  page
    .getByRole('list')
    .filter({ has: page.locator('a[href^="/catalog/"]') })
    .getByRole('listitem');

test.beforeEach(async ({ page }) => {
  await signInOnboardedStudent(page);
});

test.describe('catalog on desktop', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'filter column is desktop only');

  test('filters by provider and level, and the link reproduces the same list', async ({
    page,
    context,
  }) => {
    await page.goto('/catalog');
    await expect(resultCount(page)).toHaveText('56 certifications');

    await page.getByRole('checkbox', { name: /Amazon Web Services/ }).check();
    await page.getByRole('button', { name: 'Associate', exact: true }).click();
    await expect(page).toHaveURL(/provider=AWS/);
    await expect(page).toHaveURL(/level=associate/);
    await expect(resultCount(page)).toHaveText('3 certifications');
    await expect(page.getByRole('button', { name: 'Remove Amazon Web Services' })).toBeVisible();

    const shared = await context.newPage();
    await shared.goto(page.url());
    await expect(resultCount(shared)).toHaveText('3 certifications');
    await expect(cards(shared)).toHaveCount(3);
    await expect(shared.getByRole('checkbox', { name: /Amazon Web Services/ })).toBeChecked();
  });

  test('clears every filter at once', async ({ page }) => {
    await page.goto('/catalog?provider=REDHAT&maxDifficulty=3');
    await expect(resultCount(page)).toHaveText('0 certifications');
    await expect(page.getByRole('heading', { name: 'No certification matches' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(resultCount(page)).toHaveText('56 certifications');
    await expect(page).toHaveURL(/\/catalog$/);
  });
});

test('searches, shows the no-result state and clears the search', async ({ page }) => {
  await page.goto('/catalog');
  const search = page.getByRole('searchbox', { name: 'Search the catalog' });
  await search.fill('kubernetes');
  await expect(resultCount(page)).toHaveText('2 certifications');
  await expect(page).toHaveURL(/q=kubernetes/);

  await search.fill('no such certification');
  await expect(
    page.getByRole('heading', { name: 'No results for “no such certification”' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).first().click();
  await expect(resultCount(page)).toHaveText('56 certifications');
});

test.describe('catalog on mobile', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'filter sheet is mobile only');

  test('filters in the sheet show the same count as the list', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('button', { name: /^Filters/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('button', { name: 'Expert', exact: true }).click();
    const apply = sheet.getByRole('button', { name: /^Show \d+ certifications?$/ });
    const label = (await apply.textContent()) ?? '';
    const shown = label.replace('Show ', '');
    await apply.click();
    await expect(sheet).toBeHidden();
    await expect(resultCount(page)).toHaveText(shown);
    await expect(page.getByRole('button', { name: 'Filters · 1' })).toBeVisible();
    await expect(page).toHaveURL(/level=expert/);
  });
});

test('opens a certification, goes through the tabs and starts it', async ({ page, browser }) => {
  await page.goto('/catalog?q=saa-c03');
  await page.getByRole('link', { name: /AWS Certified Solutions Architect – Associate/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'AWS Certified Solutions Architect – Associate',
  );

  await expect(page.getByRole('heading', { name: 'Exam format' })).toBeVisible();
  await page.getByRole('tab', { name: /Syllabus/ }).click();
  await expect(page).toHaveURL(/tab=syllabus/);
  await expect(page.getByRole('heading', { name: 'Official syllabus' })).toBeVisible();
  await page.getByRole('tab', { name: /resources/i }).click();
  await expect(page.getByRole('link', { name: /Official SAA-C03 exam guide/ })).toHaveAttribute(
    'target',
    '_blank',
  );
  await page.getByRole('tab', { name: /Community/ }).click();
  await expect(page.getByRole('heading', { name: 'Who to ask?' })).toBeVisible();

  await page.getByRole('tab', { name: /Overview/ }).click();
  const status = page.getByRole('region', { name: 'My status' });
  await status.getByRole('button', { name: 'Start' }).click();
  await expect(status.getByText('In progress')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Syllabus/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // The status survives a reload, and shows on the catalog card.
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'My status' }).getByText('In progress'),
  ).toBeVisible();

  // Another student finds the first one under "Preparing it".
  const email = (await page.request.get('/api/auth/me').then((r) => r.json())) as { email: string };
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await signInOnboardedStudent(otherPage);
  await otherPage.goto('/catalog/saa-c03?tab=community&scope=class');
  const preparing = otherPage.getByRole('region', { name: 'Preparing it' });
  await expect(preparing.locator(`a[href="mailto:${email.email}"]`)).toBeVisible();
  await other.close();
});

test.describe('every certification page', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'once is enough');
  test.setTimeout(180_000);

  test('renders for all 56 seeded certifications', async ({ page }) => {
    const res = await page.request.get('/api/certifications');
    const { items } = (await res.json()) as { items: { slug: string; name: string }[] };
    expect(items).toHaveLength(56);
    for (const { slug, name } of items) {
      await page.goto(`/catalog/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible();
    }
  });
});
