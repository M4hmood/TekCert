import { flushMonitoring, initMonitoring, reportError } from './monitoring';

const DSN = 'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/1';

/** Everything the SDK tried to send, as text, instead of a network call. */
function captureInstead() {
  const sent: string[] = [];
  const transport = () => ({
    send: (envelope: unknown) => {
      sent.push(JSON.stringify(envelope));
      return Promise.resolve({});
    },
    flush: () => Promise.resolve(true),
  });
  return { sent, transport };
}

describe('monitoring', () => {
  it('stays off without a DSN, and reporting does nothing', async () => {
    expect(initMonitoring({})).toBe(false);
    expect(() => reportError(new Error('boom'))).not.toThrow();
    await expect(flushMonitoring()).resolves.toBeUndefined();
  });

  it('reports an error with its request id and route, and nothing personal', async () => {
    const { sent, transport } = captureInstead();
    // Under Jest the SDK warns that it can't trace spans, which this app doesn't use.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      initMonitoring(
        { SENTRY_DSN: DSN, NODE_ENV: 'production' },
        { transport, defaultIntegrations: false },
      ),
    ).toBe(true);

    reportError(new Error('duplicate key: (email)=(rania.gharbi@tek-up.de)'), {
      requestId: 'req-42',
      route: 'PATCH /me/account',
    });
    await flushMonitoring();

    const text = sent.join('\n');
    expect(text).toContain('duplicate key: (email)=([email])');
    expect(text).toContain('req-42');
    expect(text).toContain('PATCH /me/account');
    expect(text).toContain('"environment":"production"');
    expect(text).not.toContain('rania.gharbi');

    // Back off, so the other tests of this run send nothing.
    initMonitoring({});
    warn.mockRestore();
  });
});
