import type { Notification, NotificationList } from '@tekcert/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyMessage,
  filterLabel,
  groupNotifications,
  notificationsPath,
  notificationsSearch,
  parseNotificationFilter,
  unreadLine,
} from './format';
import { NotificationsView, type NotificationsViewProps } from './NotificationsView';

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const NOW = '2026-11-13T10:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const notification = (n: number, overrides: Partial<Notification> = {}): Notification => ({
  id: uuid(n),
  kind: 'classmates_started',
  category: 'community',
  at: '2026-11-13T08:00:00.000Z',
  read: false,
  certification: { code: 'SAA-C03', slug: 'saa-c03' },
  count: 3,
  names: ['Mehdi', 'Salma', 'Karim'],
  rank: null,
  total: null,
  change: null,
  board: null,
  level: null,
  badge: null,
  ...overrides,
});

const rank = notification(2, {
  kind: 'rank_changed',
  category: 'leaderboard',
  at: '2026-11-11T07:00:00.000Z',
  certification: null,
  count: null,
  names: [],
  rank: 14,
  total: 86,
  change: 3,
  board: 'CIM',
});
const badge = notification(3, {
  kind: 'badge_earned',
  category: 'progress',
  at: '2026-10-02T07:00:00.000Z',
  read: true,
  certification: null,
  count: null,
  names: [],
  badge: 'first_step',
});

const list = (overrides: Partial<NotificationList> = {}): NotificationList => ({
  items: [notification(1), rank, badge],
  nextCursor: null,
  unread: 2,
  ...overrides,
});

function view(overrides: Partial<NotificationsViewProps> = {}) {
  return render(
    <NotificationsView initialFilter="all" initial={list()} now={NOW} {...overrides} />,
  );
}

function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const lastCall = (mock: ReturnType<typeof mockApi>) =>
  mock.mock.calls.at(-1) as [string, RequestInit | undefined];
const filterButton = (name: string) =>
  within(screen.getByRole('group', { name: 'Filter' })).getByRole('button', { name });

function mockPhone(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: phone && query.includes('max-width'), media: query })),
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/notifications');
  router.push.mockClear();
  mockPhone(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notification formatting', () => {
  it('reads the filter from the URL and falls back to everything', () => {
    expect(parseNotificationFilter({})).toBe('all');
    expect(parseNotificationFilter({ filter: 'unread' })).toBe('unread');
    expect(parseNotificationFilter({ filter: ['progress', 'x'] })).toBe('progress');
    // Requests arrive with Release 2.
    expect(parseNotificationFilter({ filter: 'requests' })).toBe('all');
  });

  it('keeps the default filter out of the page URL, never out of the API call', () => {
    expect(notificationsSearch('all')).toBe('');
    expect(notificationsSearch('leaderboard')).toBe('filter=leaderboard');
    expect(notificationsPath('all')).toBe('/me/notifications?filter=all');
    expect(notificationsPath('unread', 'abc_1')).toBe(
      '/me/notifications?filter=unread&cursor=abc_1',
    );
  });

  it('labels the filters and the unread line', () => {
    expect(filterLabel('all', 3)).toBe('All');
    expect(filterLabel('unread', 3)).toBe('Unread · 3');
    expect(filterLabel('unread', 0)).toBe('Unread');
    expect(filterLabel('community', 3)).toBe('Community');
    expect(unreadLine(3)).toBe('3 unread');
    expect(unreadLine(0)).toBe('All read');
  });

  it('groups by day, leaving empty groups out', () => {
    const groups = groupNotifications(list().items, new Date(NOW));
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Today', [uuid(1)]],
      ['This week', [uuid(2)]],
      ['Earlier', [uuid(3)]],
    ]);
    expect(groupNotifications([badge], new Date(NOW)).map((group) => group.label)).toEqual([
      'Earlier',
    ]);
  });

  it('says why a list is empty', () => {
    expect(emptyMessage('unread').title).toBe('You’re all caught up');
    expect(emptyMessage('all').title).toBe('Nothing here yet');
    expect(emptyMessage('leaderboard').body).toBe('No leaderboard notifications so far.');
  });
});

describe('NotificationsView', () => {
  it('lists notifications by day with their words, type and button', () => {
    view();
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();

    const today = screen.getByRole('region', { name: 'Today' });
    expect(within(today).getByRole('button')).toHaveTextContent(
      'Unread: 3 students in your class started SAA-C03',
    );
    expect(today).toHaveTextContent(
      'Mehdi, Salma and Karim are preparing the same certification as you.',
    );
    expect(today).toHaveTextContent('2 h ago · Community');
    expect(within(today).getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/catalog/saa-c03?tab=community',
    );

    const week = screen.getByRole('region', { name: 'This week' });
    expect(week).toHaveTextContent('You moved up 3 places on the CIM leaderboard');
    expect(week).toHaveTextContent('You’re 14th of 86 this week.');
    expect(within(week).getByRole('link', { name: 'View leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard?period=all',
    );

    // A read notification isn't announced as unread.
    const earlier = screen.getByRole('region', { name: 'Earlier' });
    expect(within(earlier).getByRole('button')).toHaveTextContent(/^You earned the First step/);
    expect(earlier).toHaveTextContent('Oct 2 · Progress');
  });

  it('links to the notification preferences', () => {
    view();
    expect(screen.getByRole('link', { name: 'Notification preferences' })).toHaveAttribute(
      'href',
      '/settings/notifications',
    );
  });

  it('marks a notification as read when it is clicked', async () => {
    const user = userEvent.setup();
    const api = mockApi({ unread: 1 });
    view();
    const row = within(screen.getByRole('region', { name: 'Today' })).getByRole('button');
    await user.click(row);

    expect(row).not.toHaveTextContent('Unread:');
    expect(await screen.findByText('1 unread')).toBeInTheDocument();
    expect(filterButton('Unread · 1')).toBeInTheDocument();
    const [url, init] = lastCall(api);
    expect(url).toBe(`/api/me/notifications/${uuid(1)}/read`);
    expect(init).toMatchObject({ method: 'PUT' });
    // On desktop the row's own button leads to the screen: the row only marks it read.
    expect(router.push).not.toHaveBeenCalled();

    // Reading it again asks for nothing.
    await user.click(row);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('opens the screen from the row itself on phones, where the button is hidden', async () => {
    const user = userEvent.setup();
    mockPhone(true);
    mockApi({ unread: 1 });
    view();
    await user.click(within(screen.getByRole('region', { name: 'Today' })).getByRole('button'));
    expect(router.push).toHaveBeenCalledWith('/catalog/saa-c03?tab=community');
  });

  it('puts the notification back to unread when marking it fails', async () => {
    const user = userEvent.setup();
    mockApi({ type: 'about:blank', title: 'Server error', status: 500 }, 500);
    view();
    const row = within(screen.getByRole('region', { name: 'Today' })).getByRole('button');
    await user.click(row);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Couldn’t mark it as read. Try again.',
    );
    expect(row).toHaveTextContent('Unread:');
    expect(screen.getByText('2 unread')).toBeInTheDocument();
  });

  it('marks everything as read at once', async () => {
    const user = userEvent.setup();
    const api = mockApi({ unread: 0 });
    view();
    await user.click(screen.getAllByRole('button', { name: 'Mark all as read' })[0] as HTMLElement);

    expect(await screen.findByText('All read')).toBeInTheDocument();
    expect(screen.queryByText('Unread:')).not.toBeInTheDocument();
    const [url, init] = lastCall(api);
    expect(url).toBe('/api/me/notifications/read-all');
    expect(init).toMatchObject({ method: 'POST' });
    expect(await screen.findByRole('status')).toHaveTextContent('All notifications marked as read');
    for (const button of screen.getAllByRole('button', { name: 'Mark all as read' })) {
      expect(button).toBeDisabled();
    }
  });

  it('has nothing to mark when everything is read', () => {
    view({ initial: list({ items: [badge], unread: 0 }) });
    expect(screen.getByText('All read')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: 'Mark all as read' })) {
      expect(button).toBeDisabled();
    }
  });

  it('loads a filter from the API and keeps it in the URL', async () => {
    const user = userEvent.setup();
    const api = mockApi(list({ items: [rank], unread: 2 }));
    view();
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true');
    await user.click(filterButton('Leaderboard'));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Today' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('region', { name: 'This week' })).toBeInTheDocument();
    expect(filterButton('Leaderboard')).toHaveAttribute('aria-pressed', 'true');
    expect(lastCall(api)[0]).toBe('/api/me/notifications?filter=leaderboard');
    expect(window.location.search).toBe('?filter=leaderboard');

    api.mockImplementation(async () => Response.json(list()));
    await user.click(filterButton('All'));
    await screen.findByRole('region', { name: 'Today' });
    expect(window.location.search).toBe('');
  });

  it('says so when a filter has nothing to show', async () => {
    const user = userEvent.setup();
    mockApi(list({ items: [], unread: 0 }));
    view();
    await user.click(filterButton('Unread · 2'));
    expect(await screen.findByText('You’re all caught up')).toBeInTheDocument();
    expect(screen.getByText('No unread notifications.')).toBeInTheDocument();
  });

  it('adds the next page under the first', async () => {
    const user = userEvent.setup();
    const api = mockApi(list({ items: [rank, badge], nextCursor: null }));
    view({ initial: list({ items: [notification(1)], nextCursor: 'c_1', unread: 2 }) });
    expect(screen.queryByRole('region', { name: 'Earlier' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('region', { name: 'Earlier' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(lastCall(api)[0]).toBe('/api/me/notifications?filter=all&cursor=c_1');
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('offers to try again when the list could not be loaded', async () => {
    const user = userEvent.setup();
    const api = mockApi(list());
    view({ initial: null });
    expect(screen.getByRole('alert')).toHaveTextContent('Your notifications could not be loaded.');
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });
});
