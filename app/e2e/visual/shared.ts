import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const STUDENT_FILE = (name: string) => path.join(__dirname, '.auth', `${name}.json`);

/**
 * Feed times ("ING-4 CIM · 2 h ago", or "2 h ago" alone on a profile) and the dashboard's date
 * change from run to run.
 */
const MOVING_TEXT =
  /((^| · )(just now|\d+ min ago|\d+ h ago|yesterday|\d+ days ago|[A-Z][a-z]{2} \d+)$)|(^[A-Z][a-z]+day, [A-Z][a-z]+ \d+)/;

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
    mask: [page.getByText(/^(Started|Declared|started) /), page.getByText(MOVING_TEXT)],
  });
}
