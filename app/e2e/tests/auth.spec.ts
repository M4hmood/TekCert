import { expect, test } from '@playwright/test';
import { linkFromEmail, PASSWORD, signInNewStudent, uniqueEmail } from './support';

test.describe('authentication', () => {
  test('sign up → verify the email → sign out → sign in', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/sign-up');
    await page.getByLabel('First name').fill('Yassine');
    await page.getByLabel('Last name').fill('Ben Amor');
    await page.getByLabel('Institute email').fill(email);
    await expect(page.getByText('Institute address recognised')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create my account' }).click();

    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Resend in 0:5\d|Resend in 1:00/ }),
    ).toBeDisabled();

    // Open the link from the email, like the student would.
    await page.goto(await linkFromEmail(page.request, email, '/verify-email'));
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');

    // Sign out from Settings (reached through Profile on phones).
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByLabel('Institute email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('a protected page sends visitors to sign in, then back', async ({ page, browser }) => {
    const email = await signInNewStudent(await (await browser.newContext()).newPage());

    await page.goto('/catalog/saa-c03');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcatalog%2Fsaa-c03$/);
    await page.getByLabel('Institute email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/catalog\/saa-c03$/);
  });

  test('a wrong password shows the attempts left', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Institute email').fill(uniqueEmail('nobody'));
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Scoped by text: Next's route announcer is also a role="alert" element.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Incorrect email or password.' }),
    ).toContainText('You have 4 attempts left before a 15-minute lockout.');
  });

  test('an address outside @tek-up.de is refused inline', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Institute email').fill('someone@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Use your @tek-up.de address' }),
    ).toBeVisible();
  });

  test('forgot password → reset → sign in with the new password', async ({ page, browser }) => {
    const email = await signInNewStudent(await (await browser.newContext()).newPage());

    await page.goto('/sign-in');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    // Wait for the new page: the sign-in page has an "Institute email" field too.
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await page.getByLabel('Institute email').fill(email);
    await page.getByRole('button', { name: 'Send link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();

    await page.goto(await linkFromEmail(page.request, email, '/reset-password'));
    await page.getByLabel('New password').fill('brand-new-pass-7');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible();

    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.getByLabel('Institute email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('brand-new-pass-7');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('signed-in students skip the sign-in page', async ({ page }) => {
    await signInNewStudent(page);
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
