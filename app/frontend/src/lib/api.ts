import { type ProblemDetails, ProblemDetailsSchema } from '@tekcert/types';
import type { z } from 'zod';

/** Server-side only: the API base URL, read at request time so one build runs in any environment. */
export function apiUrl(): string {
  return (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem?: ProblemDetails,
  ) {
    super(problem?.detail ?? problem?.title ?? `API responded with ${status}`);
    this.name = 'ApiError';
  }
}

/** GET a JSON resource and validate it against the shared schema, so a contract drift fails loudly. */
export async function apiGet<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(`${apiUrl()}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const problem = ProblemDetailsSchema.safeParse(await res.json().catch(() => null));
    throw new ApiError(res.status, problem.success ? problem.data : undefined);
  }
  return schema.parse(await res.json());
}
