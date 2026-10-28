/** Pure helpers behind src/proxy.ts, kept separate so they can be unit-tested. */

/** Pages that work without a session. */
const PUBLIC_PAGES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];
/** Public pages a signed-in student has no reason to see. */
const SIGNED_OUT_ONLY = ['/sign-in', '/sign-up'];

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((base) => under(pathname, base));
}

export function isSignedOutOnly(pathname: string): boolean {
  return SIGNED_OUT_ONLY.some((base) => under(pathname, base));
}

/**
 * True when the JWT has not expired yet (with a margin). The signature is not checked here:
 * this only decides whether to refresh early. The API verifies every token it receives.
 */
export function isTokenFresh(token: string | undefined, nowMs: number, marginMs = 30_000): boolean {
  if (!token) return false;
  const payload = token.split('.')[1];
  if (!payload) return false;
  try {
    const { exp } = JSON.parse(base64UrlDecode(payload)) as { exp?: unknown };
    return typeof exp === 'number' && exp * 1000 > nowMs + marginMs;
  } catch {
    return false;
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
}

/** `/sign-in?next=/catalog%3Fq%3Daws` for a protected URL the visitor tried to open. */
export function signInUrlFor(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return next === '/' || next === '/dashboard'
    ? '/sign-in'
    : `/sign-in?next=${encodeURIComponent(next)}`;
}

/** Reads `name=value` from Set-Cookie headers (as returned by Headers.getSetCookie()). */
export function cookieValueFrom(setCookies: string[], name: string): string | undefined {
  const match = setCookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match?.slice(name.length + 1).split(';')[0];
}
