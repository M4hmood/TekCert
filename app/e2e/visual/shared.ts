import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const STUDENT_FILE = (name: string) => path.join(__dirname, '.auth', `${name}.json`);

/** Scrolls through the page so lazy images load, then compares it with the baseline. */
export async function shot(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 150));
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    // Dates change from one day to the next.
    mask: [page.getByText(/^(Started|Declared|started) /)],
  });
}
