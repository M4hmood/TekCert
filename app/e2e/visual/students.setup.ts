import { expect, type Page, test as setup } from '@playwright/test';
import { signInNewStudent } from '../tests/support';
import { STUDENT_FILE } from './shared';

/** Onboards as ING-4 CIM A holding CLF-C02, and stops on the recommended path. */
async function walkToResult(page: Page) {
  await signInNewStudent(page);
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /ING-4/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /^CIM/ }).click();
  await page.getByRole('button', { name: 'Group A' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('searchbox', { name: 'Search for a certification' }).fill('practitioner');
  await page.getByRole('button', { name: /AWS Certified Cloud Practitioner/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Here’s your recommended path');
}

async function finishAndStart(page: Page) {
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const started = await page.request.put('/api/me/preparations/saa-c03');
  expect(started.ok()).toBe(true);
}

setup('students', async ({ browser }) => {
  setup.setTimeout(180_000);
  const students = {
    // Stays on the recommended path screen, with a certification declared.
    result: async (page: Page) => walkToResult(page),
    // Shown in the main student's "Who to ask" lists.
    peer: async (page: Page) => {
      await walkToResult(page);
      await finishAndStart(page);
    },
    main: async (page: Page) => {
      await walkToResult(page);
      await finishAndStart(page);
    },
  };

  for (const [name, prepare] of Object.entries(students)) {
    const context = await browser.newContext({ baseURL: setup.info().project.use.baseURL });
    const page = await context.newPage();
    await prepare(page);
    await context.storageState({ path: STUDENT_FILE(name) });
    await context.close();
  }
});
