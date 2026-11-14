import * as Sentry from '@sentry/node';
import { type MonitoringEvent, scrubEvent } from '@tekcert/types';

type Options = NonNullable<Parameters<typeof Sentry.init>[0]>;

let enabled = false;

/**
 * Error monitoring (ADR-024). Off unless SENTRY_DSN is set, so local runs, tests and a
 * deployment without an account send nothing anywhere. Only errors are reported, no traces,
 * and every event goes through `scrubEvent` first: no user, cookie, body or address leaves.
 *
 * Called at the very start of main.ts, before the app is created. `overrides` is for tests.
 */
export function initMonitoring(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<Options> = {},
): boolean {
  const dsn = env.SENTRY_DSN;
  if (!dsn) {
    enabled = false;
    return false;
  }
  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? 'development',
    // This SDK collects everything by default: each category is switched off here, and
    // `scrubEvent` below is the second lock on the same door.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
    },
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event as MonitoringEvent) as typeof event,
    ...overrides,
  });
  enabled = true;
  return true;
}

export interface ErrorContext {
  /** The id the API answered with, to find the same request in the logs. */
  requestId?: string;
  /** The route pattern, e.g. "GET /community/students/:id": never the URL with its ids. */
  route?: string;
}

/** Reports an unexpected server error. Does nothing while monitoring is off. */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  if (!enabled) return;
  Sentry.captureException(error, {
    tags: {
      ...(context.requestId && { request_id: context.requestId }),
      ...(context.route && { route: context.route }),
    },
  });
}

/** Sends what is still waiting, for a clean shutdown and for tests. */
export async function flushMonitoring(timeoutMs = 2000): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}
