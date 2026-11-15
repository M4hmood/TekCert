import { describe, expect, it } from 'vitest';
import { type MonitoringEvent, REDACTED, scrubEvent, scrubText, scrubUrl } from './monitoring.js';

const TOKEN = 'a'.repeat(43);
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';

describe('scrubText', () => {
  it('cuts addresses and tokens out, and leaves the rest', () => {
    expect(scrubText('Could not email yassine.benamor@tek-up.de (code 550)')).toBe(
      'Could not email [email] (code 550)',
    );
    expect(scrubText(`link /verify-email?token=${TOKEN} failed`)).toBe(
      'link /verify-email?token=[token] failed',
    );
    expect(scrubText(`Bearer ${JWT}`)).toBe('Bearer [token]');
    expect(scrubText('relation "point_events" does not exist')).toBe(
      'relation "point_events" does not exist',
    );
  });
});

describe('scrubUrl', () => {
  it('drops the query string and the fragment', () => {
    expect(scrubUrl(`https://tekcert.tek-up.de/reset-password?token=${TOKEN}`)).toBe(
      'https://tekcert.tek-up.de/reset-password',
    );
    expect(scrubUrl('/community?q=Rania#top')).toBe('/community');
    expect(scrubUrl('/catalog/saa-c03')).toBe('/catalog/saa-c03');
  });
});

describe('scrubEvent', () => {
  const event = (): MonitoringEvent => ({
    user: { id: '6f1c', email: 'yassine.benamor@tek-up.de', ip_address: '10.0.0.7' },
    message: 'Sign-in failed for yassine.benamor@tek-up.de',
    request: {
      url: 'https://tekcert.tek-up.de/api/community/students?q=Rania',
      cookies: { tc_access: JWT },
      data: { password: 'correct-horse-9' },
      query_string: 'q=Rania',
      headers: {
        Cookie: `tc_access=${JWT}`,
        Authorization: `Bearer ${JWT}`,
        'User-Agent': 'Mozilla/5.0',
        'X-Request-Id': 'req-1',
        'X-Forwarded-For': '41.226.0.1',
      },
    },
    exception: { values: [{ value: 'duplicate key: (email)=(rania.gharbi@tek-up.de)' }] },
    breadcrumbs: [
      { category: 'ui.input', message: 'input[name="firstName"]' },
      { category: 'fetch', message: 'PATCH /api/me/account', data: { firstName: 'Yasmine' } },
      { category: 'navigation', data: { to: '/settings/account' } },
    ],
    extra: { requestId: 'req-1', body: { lastName: 'Trabelsi', nested: { token: TOKEN } } },
    contexts: { student: { email: 'x@tek-up.de', classCode: 'ING-4-CIM-A' } },
  });

  it('removes the user, the cookies, the body and the query string', () => {
    const clean = scrubEvent(event());
    expect(clean.user).toBeUndefined();
    expect(clean.request?.cookies).toBeUndefined();
    expect(clean.request?.data).toBeUndefined();
    expect(clean.request?.query_string).toBeUndefined();
    expect(clean.request?.url).toBe('https://tekcert.tek-up.de/api/community/students');
  });

  it('keeps only headers that say nothing about the person', () => {
    expect(scrubEvent(event()).request?.headers).toEqual({
      'User-Agent': 'Mozilla/5.0',
      'X-Request-Id': 'req-1',
    });
  });

  it('cuts names, addresses and tokens out of everything else', () => {
    const clean = scrubEvent(event());
    expect(clean.message).toBe('Sign-in failed for [email]');
    expect(clean.exception?.values?.[0]?.value).toBe('duplicate key: (email)=([email])');
    // What a student typed is dropped; where they went stays.
    expect(clean.breadcrumbs).toEqual([
      { category: 'fetch', message: 'PATCH /api/me/account', data: { firstName: REDACTED } },
      { category: 'navigation', data: { to: '/settings/account' } },
    ]);
    expect(clean.extra).toEqual({
      requestId: 'req-1',
      body: { lastName: REDACTED, nested: { token: REDACTED } },
    });
    expect(clean.contexts).toEqual({ student: { email: REDACTED, classCode: 'ING-4-CIM-A' } });
  });

  it('leaves nothing personal anywhere in the event', () => {
    const text = JSON.stringify(scrubEvent(event()));
    for (const secret of ['yassine', 'rania', 'Rania', 'Yasmine', 'Trabelsi', JWT, TOKEN]) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain('correct-horse-9');
    expect(text).not.toContain('41.226.0.1');
  });

  it('copes with an event that has none of these parts', () => {
    expect(scrubEvent({})).toEqual({});
  });
});
