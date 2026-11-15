import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '@/components/NotificationBell';
import { Sidebar } from '@/components/Sidebar';
import { ThemeSync } from '@/components/ThemeSync';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShellProvider } from './shell-context';

const USER = {
  firstName: 'Yassine',
  lastName: 'Ben Amor',
  email: 'yassine.benamor@tek-up.de',
  classCode: 'ING-4-CIM-C',
  avatarPath: null,
};

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  pathname.current = '/dashboard';
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('unread notifications in the shell', () => {
  it('shows the count next to Notifications in the sidebar', () => {
    render(
      <ShellProvider unread={3}>
        <Sidebar initiallyCollapsed={false} user={USER} />
      </ShellProvider>,
    );
    expect(screen.getByRole('link', { name: /Notifications.*3 unread/ })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });

  it('shows no count when everything is read', () => {
    render(
      <ShellProvider unread={0}>
        <Sidebar initiallyCollapsed={false} user={USER} />
      </ShellProvider>,
    );
    expect(screen.getByRole('link', { name: 'Notifications' })).not.toHaveTextContent('unread');
  });

  it('caps a large count', () => {
    render(
      <ShellProvider unread={250}>
        <Sidebar initiallyCollapsed={false} user={USER} />
      </ShellProvider>,
    );
    expect(screen.getByRole('link', { name: /Notifications.*250 unread/ })).toHaveTextContent(
      '99+',
    );
  });

  it('says on the bell that something is unread', () => {
    const { unmount } = render(
      <ShellProvider unread={2}>
        <NotificationBell />
      </ShellProvider>,
    );
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toHaveAttribute(
      'href',
      '/notifications',
    );
    unmount();
    render(<NotificationBell />);
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('counts again on each navigation, not on the first page', async () => {
    const api = mockApi({ unread: 5 });
    const tree = () => (
      <ShellProvider unread={1}>
        <NotificationBell />
      </ShellProvider>
    );
    const { rerender } = render(tree());
    expect(screen.getByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    // The server counted for the first page.
    expect(api).not.toHaveBeenCalled();

    pathname.current = '/catalog';
    rerender(tree());
    expect(
      await screen.findByRole('link', { name: 'Notifications, 5 unread' }),
    ).toBeInTheDocument();
    expect(api.mock.calls[0]?.[0]).toBe('/api/me/notifications/unread-count');
  });

  it('keeps the last count when counting fails', async () => {
    const api = mockApi({ type: 'about:blank', title: 'Server error', status: 500 }, 500);
    const tree = () => (
      <ShellProvider unread={1}>
        <NotificationBell />
      </ShellProvider>
    );
    const { rerender } = render(tree());
    pathname.current = '/catalog';
    rerender(tree());
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });
});

describe('the theme on the account', () => {
  it('is saved when a signed-in student changes it', async () => {
    const api = mockApi({});
    render(
      <ShellProvider unread={0}>
        <ThemeToggle />
      </ShellProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const [url, init] = api.mock.calls[0] ?? [];
    expect(url).toBe('/api/me/preferences');
    expect(init).toMatchObject({ method: 'PATCH', body: '{"theme":"dark"}' });
  });

  it('stays in the browser for a visitor', async () => {
    const api = mockApi({});
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));
    expect(document.cookie).toContain('theme=dark');
    expect(api).not.toHaveBeenCalled();
  });

  it('is taken by a new device from the account', () => {
    const api = mockApi({});
    render(<ThemeSync account="dark" cookie={null} />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
    expect(api).not.toHaveBeenCalled();
  });

  it('wins over an older choice in this browser', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeSync account="system" cookie="dark" />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain('theme=system');
  });

  it('takes the choice made in this browser before signing in', async () => {
    const api = mockApi({});
    render(<ThemeSync account={null} cookie="dark" />);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(api.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH', body: '{"theme":"dark"}' });
  });

  it('does nothing when neither has a theme', () => {
    const api = mockApi({});
    render(<ThemeSync account={null} cookie={null} />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(api).not.toHaveBeenCalled();
  });

  it('syncs once: a later answer from the server doesn’t undo a click', () => {
    const { rerender } = render(<ThemeSync account="dark" cookie={null} />);
    document.documentElement.dataset.theme = 'light';
    rerender(<ThemeSync account="dark" cookie="dark" />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
