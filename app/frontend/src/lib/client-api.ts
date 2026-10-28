import { AUTH_PROBLEM, type ProblemDetails, ProblemDetailsSchema } from '@tekcert/types';
import type { z } from 'zod';

/** Browser-side calls go through the same-origin /api proxy, so session cookies just work. */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; problem: ProblemDetails };

const NETWORK_PROBLEM: ProblemDetails = {
  type: 'about:blank',
  title: 'Network error',
  status: 503,
  detail: 'Check your connection and try again.',
};

async function call<S extends z.ZodType>(
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  schema?: S,
): Promise<ApiResult<z.infer<S>>> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, problem: NETWORK_PROBLEM };
  }
  if (!res.ok) {
    const parsed = ProblemDetailsSchema.safeParse(await res.json().catch(() => null));
    return {
      ok: false,
      problem: parsed.success
        ? parsed.data
        : { type: 'about:blank', title: res.statusText, status: res.status },
    };
  }
  const json: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  return { ok: true, data: schema ? schema.parse(json) : (json as z.infer<S>) };
}

export function postJson<S extends z.ZodType>(path: string, body?: unknown, schema?: S) {
  return call('POST', path, body ?? {}, schema);
}

/**
 * For signed-in calls: when the 15-minute access token has expired, refresh the session once and
 * retry. A second 401 means the session is gone and the caller should send the user to sign in.
 */
export async function withSessionRefresh<T>(
  request: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  const first = await request();
  if (first.ok || first.problem.type !== AUTH_PROBLEM.unauthenticated) return first;
  const refreshed = await call('POST', '/auth/refresh', {});
  return refreshed.ok ? request() : first;
}

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
