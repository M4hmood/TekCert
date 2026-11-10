import { ActivityFeedSchema, DashboardSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // A failing dashboard shows error.tsx; a failing feed only shows an error in its card.
  const [dashboard, activity] = await Promise.all([
    getAsStudent('/me/dashboard', DashboardSchema),
    getAsStudent('/activity?scope=specialty', ActivityFeedSchema).catch(() => null),
  ]);
  return <DashboardView dashboard={dashboard} activity={activity} now={new Date().toISOString()} />;
}
