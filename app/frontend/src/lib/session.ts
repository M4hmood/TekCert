import { type CurrentUser, CurrentUserSchema } from '@tekcert/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { ApiError, apiUrl } from './api';
import { ACCESS_COOKIE } from './session-cookies';

/**
 * The signed-in student for this request, or null. Server-side only: forwards the browser's
 * cookies to the API, which does the real token verification. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  if (!jar.has(ACCESS_COOKIE)) return null;
  const cookieHeader = jar
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  const res = await fetch(`${apiUrl()}/auth/me`, {
    headers: { accept: 'application/json', cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError(res.status);
  return CurrentUserSchema.parse(await res.json());
});
