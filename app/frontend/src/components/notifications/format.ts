import {
  type Notification,
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_FILTERS,
  NOTIFICATION_GROUP_LABEL,
  NOTIFICATION_GROUPS,
  type NotificationCategory,
  type NotificationFilter,
  type NotificationGroup,
  notificationGroup,
} from '@tekcert/types';

export const DEFAULT_FILTER: NotificationFilter = 'all';

/** Reads ?filter= from the page URL; anything unknown shows everything. */
export function parseNotificationFilter(
  params: Record<string, string | string[] | undefined>,
): NotificationFilter {
  const value = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  return NOTIFICATION_FILTERS.find((filter) => filter === value) ?? DEFAULT_FILTER;
}

/** The page URL's query: the default filter is left out. */
export function notificationsSearch(filter: NotificationFilter): string {
  return filter === DEFAULT_FILTER ? '' : `filter=${filter}`;
}

/** The API path for a page of the list. */
export function notificationsPath(filter: NotificationFilter, cursor?: string | null): string {
  const params = new URLSearchParams({ filter });
  if (cursor) params.set('cursor', cursor);
  return `/me/notifications?${params.toString()}`;
}

/** "All", "Unread · 3", then one per category. */
export function filterLabel(filter: NotificationFilter, unread: number): string {
  if (filter === 'all') return 'All';
  if (filter === 'unread') return unread > 0 ? `Unread · ${unread}` : 'Unread';
  return NOTIFICATION_CATEGORY_LABEL[filter];
}

/** The line under the title. */
export function unreadLine(unread: number): string {
  return unread > 0 ? `${unread} unread` : 'All read';
}

/** The round icon of each category: its tint, and whether the glyph is filled. */
export const CATEGORY_LOOK: Record<NotificationCategory, { chip: string; filled: boolean }> = {
  community: { chip: 'bg-pri-sf text-pri', filled: false },
  leaderboard: { chip: 'bg-gold-sf text-gold', filled: true },
  progress: { chip: 'bg-ok-sf text-ok', filled: false },
};

export interface NotificationSection {
  group: NotificationGroup;
  label: string;
  items: Notification[];
}

/** Today, This week, Earlier, in that order; an empty group is left out. */
export function groupNotifications(
  items: readonly Notification[],
  now: Date,
): NotificationSection[] {
  return NOTIFICATION_GROUPS.map((group) => ({
    group,
    label: NOTIFICATION_GROUP_LABEL[group],
    items: items.filter((item) => notificationGroup(new Date(item.at), now) === group),
  })).filter((section) => section.items.length > 0);
}

/** What the empty list says, which depends on what was asked for. */
export function emptyMessage(filter: NotificationFilter): { title: string; body: string } {
  if (filter === 'unread') {
    return { title: 'You’re all caught up', body: 'No unread notifications.' };
  }
  if (filter === 'all') {
    return {
      title: 'Nothing here yet',
      body: 'News about your progress, your classmates and the leaderboard will show up here.',
    };
  }
  return {
    title: 'Nothing here yet',
    body: `No ${NOTIFICATION_CATEGORY_LABEL[filter].toLowerCase()} notifications so far.`,
  };
}
