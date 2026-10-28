import { CertificationListSchema } from '@tekcert/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet } from './api';
import { isActive } from './navigation';
import { parseSidebarCollapsed, parseTheme } from './preferences';

describe('isActive', () => {
  it.each([
    ['/catalog', '/catalog', true],
    ['/catalog/saa-c03', '/catalog', true],
    ['/catalogue', '/catalog', false],
    ['/dashboard', '/catalog', false],
  ])('%s under %s → %s', (path, href, expected) => {
    expect(isActive(path, href)).toBe(expected);
  });
});

describe('preferences', () => {
  it('falls back to the system theme for unknown values', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('purple')).toBe('system');
    expect(parseTheme(undefined)).toBe('system');
  });

  it('only collapses the sidebar when asked to', () => {
    expect(parseSidebarCollapsed('collapsed')).toBe(true);
    expect(parseSidebarCollapsed(undefined)).toBe(false);
  });
});

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('calls API_URL and validates the response', async () => {
    vi.stubEnv('API_URL', 'http://api.internal/');
    const fetchMock = vi.fn(async () => Response.json({ items: [], total: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/certifications', CertificationListSchema)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith('http://api.internal/certifications', expect.anything());
  });

  it('throws an ApiError carrying the Problem Details', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ type: 'about:blank', title: 'Not Found', status: 404 }, { status: 404 }),
    );
    const error = await apiGet('/certifications/x', CertificationListSchema).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, problem: { title: 'Not Found' } });
  });

  it('rejects a response that breaks the contract', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ items: 'nope' }));
    await expect(apiGet('/certifications', CertificationListSchema)).rejects.toThrow();
  });
});
