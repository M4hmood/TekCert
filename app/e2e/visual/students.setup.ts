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

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Starts SAA-C03 and ticks its first `chapters` chapters (in syllabus order). */
async function finishAndStart(page: Page, chapters: number) {
  await finish(page);
  const started = await page.request.put('/api/me/preparations/saa-c03');
  expect(started.ok()).toBe(true);
  const detail = (await page.request.get('/api/certifications/saa-c03').then((r) => r.json())) as {
    domains: { chapters: { id: string; order: number }[] }[];
  };
  const ids = detail.domains
    .flatMap((d) => d.chapters)
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id);
  for (const id of ids.slice(0, chapters)) {
    expect((await page.request.put(`/api/me/chapters/${id}`)).ok()).toBe(true);
  }
}

setup('students', async ({ browser }) => {
  setup.setTimeout(180_000);
  const students = {
    // Stays on the recommended path screen, with a certification declared.
    result: async (page: Page) => walkToResult(page),
    // Shown in the main student's "Who to ask" lists, "Also preparing" and the feed.
    peer: async (page: Page) => {
      await walkToResult(page);
      await finishAndStart(page, 4);
      const help = await page.request.patch('/api/me/profile', {
        data: { availableToHelp: true },
      });
      expect(help.ok()).toBe(true);
    },
    main: async (page: Page) => {
      await walkToResult(page);
      await finishAndStart(page, 5);
    },
    // Onboarded, nothing started: the empty dashboard.
    fresh: async (page: Page) => {
      await walkToResult(page);
      await finish(page);
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
