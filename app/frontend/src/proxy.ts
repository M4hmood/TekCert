import { type NextRequest, NextResponse } from 'next/server';
import { apiUrl } from '@/lib/api';
import {
  cookieValueFrom,
  isPublicPage,
  isSignedOutOnly,
  isTokenFresh,
  signInUrlFor,
} from '@/lib/route-guard';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';

/**
 * Runs before every page request:
 * - visitors without a session are sent to /sign-in (and come back after signing in);
 * - an expired access token is refreshed here, so the page renders signed in;
 * - signed-in students skip the sign-in and sign-up pages.
 * The API remains the authority: this only decides where to send the browser.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (isTokenFresh(access, Date.now())) {
    return isSignedOutOnly(pathname) ? redirect(request, '/dashboard') : NextResponse.next();
  }

  if (refresh) {
    const setCookies = await refreshSession(refresh);
    if (setCookies) {
      const response = isSignedOutOnly(pathname)
        ? redirect(request, '/dashboard')
        : NextResponse.next({ request: { headers: withNewCookies(request, setCookies) } });
      setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
      return response;
    }
  }

  if (isPublicPage(pathname)) return NextResponse.next();

  const response = redirect(request, signInUrlFor(pathname, search));
  // The session can't be renewed: drop the stale cookies.
  if (access || refresh) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

export const config = {
  // Pages only: skip the API proxy, Next internals, health check and static files.
  matcher: ['/((?!api/|_next/|healthz|badges/|favicon\\.ico|.*\\.(?:png|svg|jpg|ico|woff2?)$).*)'],
};

/** Returns the new Set-Cookie headers, or null when the refresh token is no longer valid. */
async function refreshSession(refreshToken: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${apiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      cache: 'no-store',
    });
    return res.ok ? res.headers.getSetCookie() : null;
  } catch {
    return null;
  }
}

/** The rest of this request (server components, getCurrentUser) must see the new tokens. */
function withNewCookies(request: NextRequest, setCookies: string[]): Headers {
  const jar = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    const value = cookieValueFrom(setCookies, name);
    if (value) jar.set(name, value);
  }
  const headers = new Headers(request.headers);
  headers.set('cookie', [...jar].map(([name, value]) => `${name}=${value}`).join('; '));
  return headers;
}

function redirect(request: NextRequest, to: string): NextResponse {
  return NextResponse.redirect(new URL(to, request.url));
}
