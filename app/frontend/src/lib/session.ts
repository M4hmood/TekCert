import { type CurrentUser, CurrentUserSchema, ProblemDetailsSchema } from '@tekcert/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { z } from 'zod';
import { ApiError, apiUrl } from './api';
import { ACCESS_COOKIE } from './session-cookies';

/**
 * The signed-in student for this request, or null. Server-side only: forwards the browser's
 * cookies to the API, which does the real token verification. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  if (!jar.has(ACCESS_COOKIE)) return null;
  const res = await fetch(`${apiUrl()}/auth/me`, {
    headers: { accept: 'application/json', cookie: await cookieHeader() },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError(res.status);
  return CurrentUserSchema.parse(await res.json());
});

/** GET a signed-in resource as the current student. Server-side only. */
export async function getAsStudent<S extends z.ZodType>(
  path: string,
  schema: S,
): Promise<z.infer<S>> {
  const res = await fetch(`${apiUrl()}${path}`, {
    headers: { accept: 'application/json', cookie: await cookieHeader() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const problem = ProblemDetailsSchema.safeParse(await res.json().catch(() => null));
    throw new ApiError(res.status, problem.success ? problem.data : undefined);
  }
  return schema.parse(await res.json());
}

async function cookieHeader(): Promise<string> {
  return (await cookies())
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}
