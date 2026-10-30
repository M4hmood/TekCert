import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Mailpit (docker compose service "mail") catches every email the API sends. */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';

export const PASSWORD = 'correct-horse-9';

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@tek-up.de`;
}

interface MailpitSummary {
  ID: string;
  Subject: string;
}

/** Waits for an email to reach the address and returns the link it contains for `path`. */
export async function linkFromEmail(
  request: APIRequestContext,
  to: string,
  path: '/verify-email' | '/reset-password',
): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        });
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const latest = messages[0];
        if (!latest) return undefined;
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
        const { Text } = (await message.json()) as { Text: string };
        link = Text.match(new RegExp(`https?://\\S+${path}\\?token=[A-Za-z0-9_-]{43}`))?.[0];
        return link;
      },
      { message: `email with a ${path} link for ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();
  return link as string;
}

/**
 * Creates a verified account through the API and leaves the browser signed in
 * (page.request shares cookies with the page).
 */
export async function signInNewStudent(page: Page, email = uniqueEmail()): Promise<string> {
  await page.request.post('/api/auth/sign-up', {
    data: {
      firstName: 'Test',
      lastName: 'Student',
      email,
      password: PASSWORD,
      acceptVisibility: true,
    },
  });
  const link = await linkFromEmail(page.request, email, '/verify-email');
  const token = new URL(link).searchParams.get('token');
  const res = await page.request.post('/api/auth/verify-email', { data: { token } });
  expect(res.ok()).toBe(true);
  return email;
}

/**
 * Finishes onboarding through the API (ING-4 CIM, group A), as the app screens require.
 * The browser must already be signed in.
 */
export async function completeOnboarding(request: APIRequestContext): Promise<void> {
  const enrolment = await request.put('/api/onboarding/enrolment', {
    data: { year: 4, specialty: 'CIM', group: 'A' },
  });
  expect(enrolment.ok()).toBe(true);
  const done = await request.post('/api/onboarding/complete');
  expect(done.ok()).toBe(true);
}

/** A verified student who has finished onboarding, signed in in this browser. */
export async function signInOnboardedStudent(page: Page, email = uniqueEmail()): Promise<string> {
  await signInNewStudent(page, email);
  await completeOnboarding(page.request);
  return email;
}
