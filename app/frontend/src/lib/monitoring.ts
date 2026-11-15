// Types only: the SDK itself is loaded on demand, in its own chunk.
import type * as SentryBrowser from '@sentry/browser';
import { type MonitoringEvent, scrubEvent } from '@tekcert/types';

/**
 * Error monitoring in the browser (ADR-024). The server writes the address of the monitor in
 * a <meta> tag only when SENTRY_DSN is set; without it nothing is loaded and nothing is sent.
 * The SDK comes in its own chunk, so a deployment without monitoring never downloads it.
 */

type Sdk = typeof SentryBrowser;

let sdk: Promise<Sdk | null> | null = null;

const meta = (name: string) =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined;

/** Starts the monitor once, if the page says where it is. Safe to call again. */
export function startMonitoring(): void {
  if (sdk || typeof document === 'undefined') return;
  const dsn = meta('sentry-dsn');
  if (!dsn) return;
  sdk = import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: meta('sentry-environment') ?? 'production',
        // Errors only, and nothing about the person: each category the SDK would collect is
        // switched off, and `scrubEvent` cleans what is left.
        tracesSampleRate: 0,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        beforeSend: (event) => scrubEvent(event as MonitoringEvent) as typeof event,
      });
      return Sentry;
    })
    // A blocked or failed download must never break the page.
    .catch(() => null);
}

/** Reports an error an error screen caught. Does nothing while monitoring is off. */
export function reportError(error: unknown): void {
  void sdk?.then((Sentry) => Sentry?.captureException(error));
}

/** For tests: forget that the monitor was started. */
export function resetMonitoring(): void {
  sdk = null;
}
