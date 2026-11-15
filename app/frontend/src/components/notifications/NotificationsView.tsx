'use client';

import {
  type Notification,
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_FILTERS,
  type NotificationFilter,
  type NotificationList,
  NotificationListSchema,
  notificationText,
  UnreadCountSchema,
} from '@tekcert/types';
import { Button, cn, Icon, IconButton, Toast } from '@tekcert/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { timeAgo } from '@/components/dashboard/format';
import { PageHeader } from '@/components/PageHeader';
import { getJson, postJson, putJson, withSessionRefresh } from '@/lib/client-api';
import { useShell } from '@/lib/shell-context';
import { useToast } from '@/lib/use-toast';
import {
  CATEGORY_LOOK,
  emptyMessage,
  filterLabel,
  groupNotifications,
  notificationsPath,
  notificationsSearch,
  unreadLine,
} from './format';

export interface NotificationsViewProps {
  /** Parsed from the URL on the server, so a shared link opens on the same filter. */
  initialFilter: NotificationFilter;
  /** The first page; null when it could not be loaded. */
  initial: NotificationList | null;
  /** ISO time of the server render: "2 h ago" reads the same before and after hydration. */
  now: string;
}

/** Phones show a row without its button, so a tap on the row itself opens the screen. */
const PHONE = '(max-width: 767px)';

/** My notifications: filters, read and unread, grouped by day. */
export function NotificationsView({ initialFilter, initial, now }: NotificationsViewProps) {
  const router = useRouter();
  const shell = useShell();
  const { toast, show } = useToast();
  const [filter, setFilter] = useState(initialFilter);
  const [items, setItems] = useState(initial?.items ?? []);
  const [nextCursor, setNextCursor] = useState(initial?.nextCursor ?? null);
  const [unread, setUnreadHere] = useState(initial?.unread ?? 0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(!initial);
  const latest = useRef(0);
  const nowDate = new Date(now);

  /** The count on this page and the badge in the sidebar move together. */
  const setUnread = (count: number) => {
    setUnreadHere(count);
    shell.setUnread(count);
  };

  const load = async (next: NotificationFilter) => {
    setFilter(next);
    const query = notificationsSearch(next);
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    const request = ++latest.current;
    setLoading(true);
    const result = await withSessionRefresh(() =>
      getJson(notificationsPath(next), NotificationListSchema),
    );
    // A slower earlier answer must not replace a newer one.
    if (request !== latest.current) return;
    setLoading(false);
    setFailed(!result.ok);
    if (!result.ok) return;
    setItems(result.data.items);
    setNextCursor(result.data.nextCursor);
    setUnread(result.data.unread);
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    const request = latest.current;
    setLoadingMore(true);
    const result = await withSessionRefresh(() =>
      getJson(notificationsPath(filter, nextCursor), NotificationListSchema),
    );
    // The filter changed meanwhile: this page belongs to the old list.
    if (request !== latest.current) return;
    setLoadingMore(false);
    if (!result.ok) {
      show('Couldn’t load more. Try again.', { tone: 'error' });
      return;
    }
    setItems((current) => {
      const known = new Set(current.map((item) => item.id));
      return [...current, ...result.data.items.filter((item) => !known.has(item.id))];
    });
    setNextCursor(result.data.nextCursor);
    setUnread(result.data.unread);
  };

  const markRead = async (item: Notification) => {
    if (item.read) return;
    const mark = (read: boolean) =>
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read } : n)));
    mark(true);
    setUnread(Math.max(0, unread - 1));
    const result = await withSessionRefresh(() =>
      putJson(`/me/notifications/${item.id}/read`, undefined, UnreadCountSchema),
    );
    if (result.ok) {
      setUnread(result.data.unread);
    } else {
      mark(false);
      setUnread(unread);
      show('Couldn’t mark it as read. Try again.', { tone: 'error' });
    }
  };

  const markAllRead = async () => {
    const before = items;
    setItems((current) => current.map((n) => ({ ...n, read: true })));
    setUnread(0);
    const result = await withSessionRefresh(() =>
      postJson('/me/notifications/read-all', undefined, UnreadCountSchema),
    );
    if (result.ok) {
      show('All notifications marked as read');
    } else {
      setItems(before);
      setUnread(unread);
      show('Couldn’t mark them as read. Try again.', { tone: 'error' });
    }
  };

  /** A tap on the row reads it; on phones, where the row has no button, it also opens it. */
  const open = (item: Notification, href: string | undefined) => {
    void markRead(item);
    if (href && window.matchMedia(PHONE).matches) router.push(href);
  };

  const sections = groupNotifications(items, nowDate);
  const empty = emptyMessage(filter);

  return (
    <div className="flex flex-col gap-5.5 w-full max-w-215 mx-auto max-md:gap-3.5">
      <PageHeader
        title="Notifications"
        description={unreadLine(unread)}
        actions={
          <>
            <Button
              variant="secondary"
              icon="done_all"
              disabled={unread === 0}
              onClick={() => void markAllRead()}
              className="max-md:hidden"
            >
              Mark all as read
            </Button>
            <IconButton
              icon="done_all"
              label="Mark all as read"
              disabled={unread === 0}
              onClick={() => void markAllRead()}
              className="hidden max-md:grid disabled:opacity-40"
            />
            <Link
              href="/settings/notifications"
              aria-label="Notification preferences"
              title="Notification preferences"
              className="grid flex-none place-items-center size-11 border-[1.5px] border-ln2 rounded-field bg-sf text-ink2 no-underline hover:text-ink max-md:border-transparent max-md:bg-transparent"
            >
              <Icon name="tune" size={21} />
            </Link>
          </>
        }
      />

      <div
        role="group"
        aria-label="Filter"
        className="inline-flex self-start gap-0.5 p-1 rounded-[10px] bg-sf2 max-md:self-stretch max-md:gap-1.5 max-md:-mx-4 max-md:px-4 max-md:py-1 max-md:-my-1 max-md:rounded-none max-md:bg-transparent max-md:overflow-x-auto"
      >
        {NOTIFICATION_FILTERS.map((option) => {
          const on = option === filter;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => !on && void load(option)}
              className={cn(
                'h-9.5 px-3.5 border-none rounded-[7px] bg-transparent text-ink2 text-[13.5px] font-semibold whitespace-nowrap cursor-pointer',
                'max-md:tap-target max-md:flex-none max-md:h-9 max-md:border-[1.5px] max-md:border-solid max-md:border-ln2 max-md:rounded-[18px] max-md:text-ink',
                on &&
                  'bg-sf text-ink shadow-[0_1px_2px_rgba(19,26,44,.12)] max-md:border-pri max-md:bg-pri max-md:text-pri-ink max-md:shadow-none',
              )}
            >
              {filterLabel(option, unread)}
            </button>
          );
        })}
      </div>

      {failed && (
        <p role="alert" className="text-err text-[14px]">
          Your notifications could not be loaded.{' '}
          <button
            type="button"
            className="p-0 border-none bg-transparent text-pri font-semibold underline cursor-pointer"
            onClick={() => void load(filter)}
          >
            Try again
          </button>
        </p>
      )}

      <div
        aria-busy={loading}
        className={cn(
          'flex flex-col gap-5.5 transition-opacity duration-150 max-md:gap-3.5',
          loading && 'opacity-55',
        )}
      >
        {sections.map((section) => (
          <section
            key={section.group}
            aria-labelledby={`notifications-${section.group}`}
            className="flex flex-col gap-2"
          >
            <h2
              id={`notifications-${section.group}`}
              className="px-1 text-ink3 text-[12px] font-semibold tracking-[0.1em] uppercase"
            >
              {section.label}
            </h2>
            <ul className="border border-ln rounded-[14px] bg-sf overflow-hidden max-md:-mx-4 max-md:border-x-0 max-md:rounded-none">
              {section.items.map((item) => (
                <NotificationRow key={item.id} item={item} now={nowDate} onOpen={open} />
              ))}
            </ul>
          </section>
        ))}

        {!failed && sections.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 py-16 px-6 border-[1.5px] border-dashed border-ln2 rounded-[16px] text-center">
            <Icon name="notifications_off" size={36} className="text-ink3" />
            <p className="font-serif text-[22px] font-semibold">{empty.title}</p>
            <p className="text-ink2 text-[14.5px]">{empty.body}</p>
          </div>
        )}

        {nextCursor && (
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="self-center"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>

      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </div>
  );
}

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: Notification;
  now: Date;
  onOpen: (item: Notification, href: string | undefined) => void;
}) {
  const text = notificationText(item);
  const look = CATEGORY_LOOK[item.category];
  return (
    <li
      className={cn(
        'grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-4 py-4 px-5 border-b border-ln last:border-b-0 max-md:grid-cols-[40px_minmax(0,1fr)_auto] max-md:gap-3 max-md:py-3.5 max-md:px-4',
        !item.read && 'bg-pri-sf',
      )}
    >
      <span
        aria-hidden
        className={cn('grid place-items-center size-11 rounded-full max-md:size-10', look.chip)}
      >
        <Icon name={text.icon} size={22} filled={look.filled} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(item, text.action?.href)}
        className="flex flex-col gap-1 min-w-0 p-0 border-none bg-transparent text-ink text-start cursor-pointer max-md:gap-0.75"
      >
        <span
          className={cn(
            'text-[15px] leading-[1.45] max-md:text-[14.5px] max-md:leading-[1.4]',
            item.read ? 'font-medium' : 'font-semibold',
          )}
        >
          {!item.read && <span className="sr-only">Unread: </span>}
          {text.title}
        </span>
        <span className="text-ink2 text-[14px] leading-[1.5] max-md:hidden">{text.body}</span>
        <span className="text-ink3 text-[12.5px]">
          {timeAgo(item.at, now)}
          <span className="max-md:hidden"> · {NOTIFICATION_CATEGORY_LABEL[item.category]}</span>
        </span>
      </button>
      <span className="flex items-center gap-2.5 self-center max-md:self-start max-md:mt-1.5">
        {text.action && (
          <Link
            href={text.action.href}
            onClick={() => onOpen(item, undefined)}
            className="flex items-center h-9.5 px-3.5 border-[1.5px] border-ln2 rounded-[9px] text-ink text-[13.5px] font-semibold whitespace-nowrap no-underline hover:bg-sf2 max-md:hidden"
          >
            {text.action.label}
          </Link>
        )}
        <span
          aria-hidden
          className={cn('size-2.5 rounded-full', item.read ? 'bg-transparent' : 'bg-pri')}
        />
      </span>
    </li>
  );
}
