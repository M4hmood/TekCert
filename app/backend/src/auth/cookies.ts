import type { CookieOptions, Response } from 'express';
import { ACCESS_TOKEN_TTL_MS } from './access-token.service';

export const ACCESS_COOKIE = 'tc_access';
export const REFRESH_COOKIE = 'tc_refresh';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  /** "Stay signed in": persistent refresh cookie; otherwise it ends with the browser. */
  remember: boolean;
  refreshExpiresAt: Date;
}

/**
 * Both cookies are httpOnly, first-party (the browser only talks to the web origin, which proxies
 * /api/*) and SameSite=Lax: sent when following a link into the app, never on cross-site POSTs.
 * Path is / so the web server can refresh a session while rendering any page.
 */
export function setSessionCookies(res: Response, session: IssuedSession, secure: boolean): void {
  const base: CookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  res.cookie(ACCESS_COOKIE, session.accessToken, { ...base, maxAge: ACCESS_TOKEN_TTL_MS });
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...base,
    ...(session.remember && { expires: session.refreshExpiresAt }),
  });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  const base: CookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
