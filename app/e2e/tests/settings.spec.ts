import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import {
  completeOnboarding,
  expireAcademicYear,
  PASSWORD,
  signInNewStudent,
  uniqueEmail,
} from './support';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** Classes of their own for this file, one per viewport (see notifications.spec.ts). */
const classFor = (page: Page) => ({ year: 4, specialty: 'AIOT', group: isPhone(page) ? 'D' : 'C' });

async function signIn(page: Page, names?: { firstName: string; lastName: string }) {
  const email = await signInNewStudent(page, uniqueEmail(), names);
  await completeOnboarding(page.request, [], classFor(page));
  return email;
}

const section = (page: Page) => page.getByRole('heading', { level: 2 });
const toast = (page: Page) => page.getByRole('status');

test('opens every section, from a list on phones and a side menu on desktop', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  const nav = page.getByRole('navigation', { name: 'Settings sections' });

  if (isPhone(page)) {
    // The list alone, then each section on its own page with a way back.
    await expect(section(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    for (const name of ['Account', 'Enrolment', 'Privacy', 'Notifications', 'Appearance']) {
      await nav.getByRole('link', { name: new RegExp(`^${name}`) }).click();
      await expect(section(page)).toHaveText(name);
      await expect(nav).toBeHidden();
      await page.getByRole('main').getByRole('link', { name: 'Settings' }).click();
      await expect(page).toHaveURL(/\/settings$/);
    }
  } else {
    // Account is open next to the menu, and the menu marks the open section.
    await expect(section(page)).toHaveText('Account');
    for (const name of ['Enrolment', 'Privacy', 'Notifications', 'Appearance', 'Account']) {
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`/settings/${name.toLowerCase()}$`));
      await expect(section(page)).toHaveText(name);
      await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
    }
  }
  await page.goto('/settings/billing');
  await expect(page.getByText('This page doesn’t exist')).toBeVisible();
});

test('changes my name and exports my data', async ({ page }) => {
  const email = await signIn(page, { firstName: 'Yassine', lastName: 'Ben Amor' });
  await page.goto('/settings/account');
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByLabel('Email')).not.toBeEditable();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

  await page.getByLabel('First name').fill('');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Required' })).toBeVisible();

  await page.getByLabel('First name').fill('Yasmine');
  await page.getByLabel('Last name').fill('Trabelsi');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toHaveText(/Name saved/);
  if (!isPhone(page)) {
    await expect(page.getByRole('complementary')).toContainText('Yasmine Trabelsi');
  }
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Yasmine');
  await expect(page.getByLabel('Last name')).toHaveValue('Trabelsi');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  await expect(toast(page)).toHaveText(/Your data was downloaded/);
  expect(file.suggestedFilename()).toBe('tekcert-export.csv');
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv).toContain('record,code,name,status,points,date');
  expect(csv).toContain(`profile,${email},Yasmine Trabelsi,`);
});

test('moves me to another class', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/enrolment');
  const klass = classFor(page);
  await expect(page.getByText(`ING-4 AIOT · group ${klass.group}`)).toBeVisible();
  await expect(page.getByRole('radio', { name: /AIOT/ })).toBeChecked();

  // ING-2 has no specialty: the question becomes the one aimed for, "Undecided" included.
  await page.getByRole('combobox', { name: 'Year' }).click();
  await page.getByRole('option', { name: 'ING-2' }).click();
  const target = page.getByRole('radiogroup', { name: 'Specialty you’re aiming for' });
  await target.getByRole('radio', { name: /Undecided/ }).click();
  await expect(page.getByText(/your recommended path is Fundamentals/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Group' }).click();
  await page.getByRole('option', { name: 'Group B' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toHaveText(/Enrolment saved/);
  if (!isPhone(page)) {
    await expect(page.getByRole('complementary')).toContainText('ING-2 · Group B');
  }

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Year' })).toContainText('ING-2');
  await expect(page.getByRole('combobox', { name: 'Group' })).toContainText('Group B');
  await expect(page.getByRole('radio', { name: /Undecided/ })).toBeChecked();
  await expect(page.getByText('ING-2 · group B', { exact: true })).toBeVisible();
});

test('keeps my privacy and notification choices', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/privacy');
  const leaderboard = page.getByRole('switch', { name: 'Appear on the leaderboard' });
  await expect(leaderboard).toBeChecked();
  await expect(page.getByRole('switch')).toHaveCount(2);
  await leaderboard.click();
  await expect(toast(page)).toHaveText(/You now appear as Anonymous on the leaderboard/);
  await page.reload();
  await expect(leaderboard).not.toBeChecked();

  await page.goto('/settings/notifications');
  const table = page.getByRole('table', { name: 'Notification preferences' });
  await expect(table.getByRole('row')).toHaveCount(4);
  const progressEmail = page.getByRole('switch', { name: 'Progress by email' });
  const communityEmail = page.getByRole('switch', { name: 'Community by email' });
  await expect(progressEmail).toBeChecked();
  await expect(communityEmail).not.toBeChecked();
  await progressEmail.click();
  await expect(toast(page)).toHaveText(/Notification preferences saved/);
  // The switch moves at once; the reload waits for the save behind it.
  const saved = page.waitForResponse(
    (res) => res.url().endsWith('/api/me/notification-preferences') && res.ok(),
  );
  await communityEmail.click();
  await expect(communityEmail).toBeChecked();
  await saved;
  await page.reload();
  await expect(progressEmail).not.toBeChecked();
  await expect(communityEmail).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Progress in the app' })).toBeChecked();
});

test('keeps my theme on my account, so another browser opens in it', async ({ page, browser }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const email = await signIn(page);
  await page.goto('/settings/appearance');
  const html = page.locator('html');
  await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
  await expect(html).not.toHaveAttribute('data-theme');

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toast(page)).toHaveText(/Dark theme on/);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();

  // A second browser with no cookie of its own, on a light device.
  const context = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
    colorScheme: 'light',
  });
  const other = await context.newPage();
  await other.goto('/sign-in');
  await expect(other.locator('html')).not.toHaveAttribute('data-theme');
  await other.getByLabel('Institute email').fill(email);
  await other.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await other.getByRole('button', { name: 'Sign in' }).click();
  await expect(other).toHaveURL(/\/dashboard$/);
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The header button there saves to the account too: the first browser follows on reload.
  await other.getByRole('button', { name: 'Change theme' }).click();
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect
    .poll(
      async () =>
        ((await other.request.get('/api/auth/me').then((r) => r.json())) as { theme: string })
          .theme,
    )
    .toBe('light');
  await context.close();
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();

  await page.getByRole('radio', { name: 'System' }).click();
  await expect(html).not.toHaveAttribute('data-theme');
  await expect(toast(page)).toHaveText(/Theme matches your device/);
});

test.describe('the new academic year', () => {
  test('asks where I am this year, can wait a day, and moves me up', async ({ page }) => {
    test.setTimeout(90_000);
    const email = await signIn(page, { firstName: 'Yassine', lastName: 'Ben Amor' });
    await page.goto('/dashboard');
    await expect(page.getByRole('dialog')).toBeHidden();

    expireAcademicYear(email);
    await page.reload();
    const prompt = page.getByRole('dialog');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText('academic year');
    await expect(prompt).toContainText(
      `Last year you were in ING-4 AIOT, group ${classFor(page).group}.`,
    );
    await expect(prompt.getByRole('radio', { name: /I’m moving up to ING-5/ })).toBeChecked();
    await expect(prompt.getByRole('radio')).toHaveCount(3);

    // "Remind me tomorrow" keeps it away on this device, reloads included.
    await prompt.getByRole('button', { name: 'Remind me tomorrow' }).click();
    await expect(prompt).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello Yassine');
    await expect(prompt).toBeHidden();

    // Settings still says the year isn't confirmed, and opens the same question.
    await page.goto('/settings/enrolment');
    await expect(page.getByText(/academic year not confirmed/)).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(prompt).toBeVisible();
    await prompt.getByRole('combobox', { name: 'Group in ING-5' }).click();
    await page.getByRole('option', { name: 'Group A' }).click();
    await prompt.getByRole('button', { name: 'Confirm' }).click();
    await expect(prompt).toBeHidden();
    await expect(toast(page)).toHaveText(/Academic year confirmed/);

    await expect(page.getByText(/academic year not confirmed/)).toBeHidden();
    await expect(page.getByRole('combobox', { name: 'Year' })).toContainText('ING-5');
    await expect(page.getByText('ING-5 AIOT · group A')).toBeVisible();
    await page.reload();
    await expect(page.getByText(/academic year not confirmed/)).toBeHidden();
    await expect(prompt).toBeHidden();
    const me = (await page.request.get('/api/auth/me').then((r) => r.json())) as {
      classCode: string;
      yearPromptDue: boolean;
    };
    expect(me).toMatchObject({ classCode: 'ING-5-AIOT-A', yearPromptDue: false });
  });

  test('switches me to alumni mode when I left, and back when I save a class', async ({ page }) => {
    test.setTimeout(90_000);
    const email = await signIn(page);
    expireAcademicYear(email);
    await page.goto('/dashboard');
    const prompt = page.getByRole('dialog');
    await prompt.getByRole('radio', { name: /I’m no longer at TEK-UP/ }).click();
    await expect(prompt.getByRole('combobox')).toHaveCount(0);
    await prompt.getByRole('button', { name: 'Confirm' }).click();
    await expect(prompt).toBeHidden();
    await expect(toast(page)).toHaveText(/Academic year confirmed/);

    await page.goto('/profile');
    await expect(page.getByText(/Alumni · ING-4 AIOT/)).toBeVisible();
    // Off the leaderboards.
    await page.goto('/leaderboard?scope=class&period=all');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leaderboard');
    await expect(page.getByRole('main')).not.toContainText('You ·');

    await page.goto('/settings/enrolment');
    await expect(page.getByText('You’re in alumni mode.')).toBeVisible();
    await expect(prompt).toBeHidden();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toHaveText(/Enrolment saved/);
    await expect(page.getByText('You’re in alumni mode.')).toBeHidden();
    await page.goto('/profile');
    await expect(page.getByText(/ING-4 AIOT · group/)).toBeVisible();
    await expect(page.getByText(/Alumni ·/)).toHaveCount(0);
  });
});
