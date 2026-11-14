import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportError, resetMonitoring, startMonitoring } from './monitoring';

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock('@sentry/browser', () => sentry);

function addMeta(name: string, content: string) {
  const tag = document.createElement('meta');
  tag.name = name;
  tag.content = content;
  document.head.append(tag);
}

beforeEach(() => {
  resetMonitoring();
  sentry.init.mockClear();
  sentry.captureException.mockClear();
});
afterEach(() => {
  document.head.querySelectorAll('meta[name^="sentry-"]').forEach((tag) => tag.remove());
});

describe('browser monitoring', () => {
  it('loads nothing and sends nothing when the page names no monitor', async () => {
    startMonitoring();
    reportError(new Error('boom'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('starts once with the address from the page, collecting nothing personal', async () => {
    addMeta('sentry-dsn', 'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/2');
    addMeta('sentry-environment', 'staging');
    startMonitoring();
    startMonitoring();
    const error = new Error('boom');
    reportError(error);

    await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
    expect(sentry.init).toHaveBeenCalledOnce();
    const options = sentry.init.mock.calls[0]?.[0] as {
      dsn: string;
      environment: string;
      tracesSampleRate: number;
      dataCollection: Record<string, unknown>;
      beforeSend: (event: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(options).toMatchObject({
      dsn: 'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/2',
      environment: 'staging',
      tracesSampleRate: 0,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
    });
    // Whatever the SDK gathers anyway is cleaned before it leaves.
    expect(
      options.beforeSend({
        user: { email: 'rania.gharbi@tek-up.de' },
        message: 'Could not save rania.gharbi@tek-up.de',
      }),
    ).toEqual({ message: 'Could not save [email]' });
  });
});
