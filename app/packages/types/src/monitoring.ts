/**
 * What may leave for the error monitor (ADR-024): where and why something broke, never who it
 * happened to. The web app and the API both pass every event through `scrubEvent` first.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Sign-in tokens and email links: 43 characters of base64url, or a JWT. */
const TOKEN = /\b(?:[A-Za-z0-9_-]{43}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g;
const SENSITIVE_KEY = /pass|token|secret|cookie|authorization|email|name|session/i;

export const REDACTED = '[redacted]';

/** Removes addresses and tokens from a piece of text. */
export function scrubText(text: string): string {
  return text.replace(EMAIL, '[email]').replace(TOKEN, '[token]');
}

/** A URL without its query string, which can carry a token or a search for a name. */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/);
  return scrubText(cut < 0 ? url : url.slice(0, cut));
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 6) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(item, depth + 1),
    ]),
  );
}

/** The parts of an error-monitor event this function knows how to clean. */
export interface MonitoringEvent {
  user?: unknown;
  message?: string;
  request?: {
    url?: string;
    cookies?: unknown;
    headers?: Record<string, string>;
    data?: unknown;
    query_string?: unknown;
  };
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: { category?: string; message?: string; data?: Record<string, unknown> }[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
}

/** Headers that say nothing about the person: the rest are dropped. */
const KEPT_HEADERS = ['user-agent', 'accept', 'accept-language', 'content-type', 'x-request-id'];

/**
 * Cleans an event in place and returns it:
 * - no user, cookies, request body or query string;
 * - only harmless headers;
 * - addresses and tokens cut out of every message;
 * - nothing a student typed (input breadcrumbs).
 */
export function scrubEvent<E extends MonitoringEvent>(event: E): E {
  delete event.user;
  if (event.message) event.message = scrubText(event.message);
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([name]) =>
          KEPT_HEADERS.includes(name.toLowerCase()),
        ),
      );
    }
  }
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrubText(value.value);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((crumb) => crumb.category !== 'ui.input')
      .map((crumb) => ({
        ...crumb,
        ...(crumb.message && { message: scrubText(crumb.message) }),
        ...(crumb.data && { data: scrubValue(crumb.data) as Record<string, unknown> }),
      }));
  }
  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  return event;
}
