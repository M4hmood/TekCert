import { NotificationListSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { notificationsPath, parseNotificationFilter } from '@/components/notifications/format';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NotificationsPage({ searchParams }: Props) {
  const filter = parseNotificationFilter(await searchParams);
  const list = await getAsStudent(notificationsPath(filter), NotificationListSchema).catch(
    () => null,
  );
  return <NotificationsView initialFilter={filter} initial={list} now={new Date().toISOString()} />;
}
