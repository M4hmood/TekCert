import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const STUDENT_FILE = (name: string) => path.join(__dirname, '.auth', `${name}.json`);

/**
 * The database of the visual run (playwright.visual.config.ts). VISUAL_DATABASE_URL moves it,
 * for a machine where Postgres can't listen on 5432 (Windows sometimes reserves that range).
 */
export const VISUAL_DATABASE_URL =
  process.env.VISUAL_DATABASE_URL ?? 'postgresql://tekcert:tekcert@localhost:5432/tekcert_visual';

/**
 * Feed times ("ING-4 CIM · 2 h ago", "2 h ago" alone on a profile, "2 h ago · Progress" on a
 * notification) and the dashboard's date change from run to run.
 */
const MOVING_TEXT =
  /((^| · )(just now|\d+ min ago|\d+ h ago|yesterday|\d+ days ago|[A-Z][a-z]{2} \d+)( · (Community|Leaderboard|Progress))?$)|(^[A-Z][a-z]+day, [A-Z][a-z]+ \d+)/;

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
    // Dates change from one day to the next, and every run signs up with new addresses.
    mask: [
      page.getByText(/^(Started|Declared|started) /),
      page.getByText(MOVING_TEXT),
      // "2026-27 academic year": a new one every September.
      page.getByText(/\d{4}-\d{2} academic year/),
      page.getByText(/^e2e\.[0-9a-f]+@tek-up\.de$/),
      // Settings › Account shows the address in a read-only field.
      page.locator('main input[type="email"][readonly]'),
      // The phone's mail button shows the address in a proportional font: mask the whole button.
      page.locator('main a[href^="mailto:"]'),
    ],
  });
}
