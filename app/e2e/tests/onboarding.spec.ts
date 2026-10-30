import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { signInNewStudent, signInOnboardedStudent } from './support';

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const PHOTO = path.join(__dirname, 'fixtures', 'photo.png');

test.describe('onboarding', () => {
  test('a new student is sent to onboarding, outside the shell', async ({ page }) => {
    await signInNewStudent(page);
    await page.goto('/catalog');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(heading(page)).toHaveText('Which year are you in?');
    await expect(page.getByText('Welcome, Test')).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('ING-4 CIM: specialty, certification, photo, leaderboards → recommended path → dashboard', async ({
    page,
    viewport,
  }) => {
    test.skip((viewport?.width ?? 0) < 768, 'desktop layout');
    await signInNewStudent(page);
    await page.goto('/onboarding');

    await expect(page.getByText('Step 1 of 4 · Year')).toBeVisible();
    await page.getByRole('button', { name: /ING-4/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(heading(page)).toHaveText('What’s your specialty?');
    await expect(page.getByText('Step 2 of 4 · Specialty')).toBeVisible();
    await expect(page.getByText('Path: CLF-C02 → SAA-C03 → SOA-C03')).toBeVisible();
    await page.getByRole('button', { name: /^CIM/ }).click();
    await page.getByRole('button', { name: 'Group C' }).click();
    await expect(page.getByText('Your class: ING-4-CIM-C')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(heading(page)).toHaveText('Do you already have certifications?');
    await page.getByRole('searchbox', { name: 'Search for a certification' }).fill('practitioner');
    await page.getByRole('button', { name: /AWS Certified Cloud Practitioner/ }).click();
    await expect(page.getByText('1 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(heading(page)).toHaveText('Add a profile photo');
    await page.getByLabel('Profile photo file').setInputFiles(PHOTO);
    const crop = page.getByRole('dialog', { name: 'Crop your photo' });
    await expect(crop).toBeVisible();
    await crop.getByRole('button', { name: 'Use this photo' }).click();
    await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
    // The cropped photo is served back through the API.
    const photo = page.locator('img[src^="/api/users/"]');
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);

    const leaderboards = page.getByRole('switch', { name: 'Appear on leaderboards' });
    await expect(leaderboards).toHaveAttribute('aria-checked', 'true');
    await leaderboards.click();
    await expect(leaderboards).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(heading(page)).toHaveText('Here’s your recommended path');
    await expect(page.getByText('CIM · Cloud Infrastructure Management')).toBeVisible();
    const nodes = page.getByRole('region', { name: 'Recommended path' }).getByRole('listitem');
    await expect(nodes).toHaveCount(3);
    await expect(nodes.nth(0)).toContainText('CLF-C02 · Foundational');
    await expect(nodes.nth(0)).toContainText('Unverified');
    await expect(nodes.nth(1)).toContainText('Your next step');
    await expect(page.getByText('9 certifications in this path')).toBeVisible();

    await page.getByRole('button', { name: 'Go to my dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const account = page.getByRole('link', { name: /Test Student/ });
    await expect(account).toContainText('ING-4-CIM-C');
    await expect(account.locator('img')).toBeVisible();
  });

  test('ING-3 on a phone: target specialty and group', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) >= 768, 'mobile layout');
    await signInNewStudent(page);
    await page.goto('/onboarding');

    await page.getByRole('button', { name: /ING-3/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(heading(page)).toHaveText('Which specialty are you aiming for?');
    await expect(page.getByText('2/4')).toBeVisible();
    await expect(page.getByText('You’ll confirm it when you enter ING-4.')).toBeVisible();

    await page.getByRole('button', { name: /^SSIR/ }).click();
    await page.getByRole('button', { name: 'Group B' }).click();
    const cta = page.getByRole('button', { name: 'Continue · ING-3 Group B' });
    await expect(cta).toBeInViewport();
    await cta.click();
    await expect(heading(page)).toHaveText('Do you already have certifications?');

    await page.getByRole('button', { name: 'Skip this step' }).click();
    await page.getByRole('button', { name: 'Later' }).click();
    await expect(page.getByText(/SSIR · Systems Security/)).toBeVisible();
    await expect(page.getByText('your target specialty')).toBeVisible();
  });

  test('reloading resumes on the same step with the saved answers', async ({ page }) => {
    await signInNewStudent(page);
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /ING-2/ }).click();
    await page.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: /Undecided/ }).click();
    await page.getByRole('button', { name: 'Group A' }).click();
    await page.getByRole('button', { name: /^Continue/ }).click();
    await expect(heading(page)).toHaveText('Do you already have certifications?');

    await page.reload();
    await expect(heading(page)).toHaveText('Do you already have certifications?');
    // Leaving and coming back resumes at the furthest step saved.
    await page.goto('/onboarding');
    await expect(heading(page)).toHaveText('Do you already have certifications?');
    // Going back shows the saved class.
    await page.getByRole('button', { name: 'Back' }).last().click();
    await expect(page.getByRole('button', { name: /Undecided/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Your class: ING-2-A')).toBeVisible();
  });

  test('a student who finished onboarding goes to the dashboard', async ({ page }) => {
    await signInOnboardedStudent(page);
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
