import { AUTH_PROBLEM } from '@tekcert/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJson, safeNextPath, withSessionRefresh } from './client-api';
import {
  cookieValueFrom,
  isPublicPage,
  isSignedOutOnly,
  isTokenFresh,
  signInUrlFor,
} from './route-guard';

/** An unsigned JWT is enough here: the guard only reads `exp`. */
function jwtExpiringAt(expSeconds: number): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: expSeconds })}.signature`;
}

describe('route guard helpers', () => {
  it('classifies pages', () => {
    expect(isPublicPage('/sign-in')).toBe(true);
    expect(isPublicPage('/reset-password')).toBe(true);
    expect(isPublicPage('/dashboard')).toBe(false);
    expect(isPublicPage('/sign-in-help')).toBe(false);
    expect(isSignedOutOnly('/sign-up')).toBe(true);
    expect(isSignedOutOnly('/verify-email')).toBe(false);
  });

  it('treats a token as fresh only well before it expires', () => {
    const now = 1_800_000_000_000;
    expect(isTokenFresh(jwtExpiringAt(now / 1000 + 600), now)).toBe(true);
    expect(isTokenFresh(jwtExpiringAt(now / 1000 + 10), now)).toBe(false);
    expect(isTokenFresh(undefined, now)).toBe(false);
    expect(isTokenFresh('garbage', now)).toBe(false);
  });

  it('remembers where the student was going', () => {
    expect(signInUrlFor('/catalog/saa-c03', '?tab=syllabus')).toBe(
      '/sign-in?next=%2Fcatalog%2Fsaa-c03%3Ftab%3Dsyllabus',
    );
    expect(signInUrlFor('/dashboard', '')).toBe('/sign-in');
  });

  it('reads cookie values from Set-Cookie headers', () => {
    const headers = ['tc_access=abc.def; Path=/; HttpOnly', 'tc_refresh=xyz; Path=/; HttpOnly'];
    expect(cookieValueFrom(headers, 'tc_refresh')).toBe('xyz');
    expect(cookieValueFrom(headers, 'other')).toBeUndefined();
  });
});

describe('client API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('only accepts same-site paths after sign-in', () => {
    expect(safeNextPath('/catalog')).toBe('/catalog');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });

  it('refreshes the session once and retries after a 401', async () => {
    const responses = [
      Response.json(
        { type: AUTH_PROBLEM.unauthenticated, title: 'Sign in required', status: 401 },
        { status: 401 },
      ),
      new Response(null, { status: 204 }),
      Response.json({ status: 'accepted' }),
    ];
    const fetchMock = vi.fn(async () => responses.shift() ?? new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await withSessionRefresh(() => postJson('/something'));
    expect(result).toEqual({ ok: true, data: { status: 'accepted' } });
    expect(fetchMock.mock.calls.map((call) => (call as unknown as [string])[0])).toEqual([
      '/api/something',
      '/api/auth/refresh',
      '/api/something',
    ]);
  });

  it('reports a network failure as a problem', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const result = await postJson('/auth/sign-in', {});
    expect(result).toMatchObject({ ok: false, problem: { title: 'Network error' } });
  });
});
