import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Mailpit (docker compose service "mail") catches every email the API sends. */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';

/** The database the Playwright servers use (playwright.config.ts). */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://tekcert:tekcert@localhost:5432/tekcert_test';

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
export async function signInNewStudent(
  page: Page,
  email = uniqueEmail(),
  names: { firstName?: string; lastName?: string } = {},
): Promise<string> {
  await page.request.post('/api/auth/sign-up', {
    data: {
      firstName: names.firstName ?? 'Test',
      lastName: names.lastName ?? 'Student',
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
 * Finishes onboarding through the API (ING-4 CIM, group A unless `klass` says otherwise), as
 * the app screens require.
 * The browser must already be signed in.
 */
export async function completeOnboarding(
  request: APIRequestContext,
  certifications: string[] = [],
  klass: { year: number; group: string } & (
    { specialty: string } | { targetSpecialty: string | null }
  ) = {
    year: 4,
    specialty: 'CIM',
    group: 'A',
  },
): Promise<void> {
  const enrolment = await request.put('/api/onboarding/enrolment', { data: klass });
  expect(enrolment.ok()).toBe(true);
  if (certifications.length) {
    const declared = await request.put('/api/onboarding/certifications', {
      data: { slugs: certifications },
    });
    expect(declared.ok()).toBe(true);
  }
  const done = await request.post('/api/onboarding/complete');
  expect(done.ok()).toBe(true);
}

/** A verified student who has finished onboarding, signed in in this browser. */
export async function signInOnboardedStudent(page: Page, email = uniqueEmail()): Promise<string> {
  await signInNewStudent(page, email);
  await completeOnboarding(page.request);
  return email;
}

/** Waits for an email with this subject to reach the address and returns its text. */
export async function emailWithSubject(
  request: APIRequestContext,
  to: string,
  subject: string,
): Promise<string> {
  let text: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        });
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const found = messages.find((message) => message.Subject === subject);
        if (!found) return undefined;
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${found.ID}`);
        text = ((await message.json()) as { Text: string }).Text;
        return text;
      },
      { message: `email "${subject}" for ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();
  return text as string;
}

/**
 * Puts a student back a year: the API has no way to do it, and the servers run on the real
 * clock, so this is how a test gets the "new academic year" prompt. `email` comes from
 * uniqueEmail(), so it is safe inside the statement.
 */
export function expireAcademicYear(email: string, databaseUrl = TEST_DATABASE_URL): void {
  if (!/^[a-z0-9.]+@tek-up\.de$/.test(email)) throw new Error(`Unexpected email: ${email}`);
  execSync(
    `pnpm --filter backend typeorm query "UPDATE users SET enrolment_confirmed_year = enrolment_confirmed_year - 1 WHERE email = '${email}'"`,
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
  );
}
