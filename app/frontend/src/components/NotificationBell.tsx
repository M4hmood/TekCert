'use client';

import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import { useShell } from '@/lib/shell-context';

/** The bell in the dashboard header; a dot says something is unread. */
export function NotificationBell() {
  const { unread } = useShell();
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className="relative grid flex-none place-items-center size-11 border-[1.5px] border-ln2 rounded-field bg-sf text-ink2 no-underline hover:text-ink max-md:border-transparent max-md:bg-transparent"
    >
      <Icon name="notifications" size={21} />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute top-2 end-2.25 size-2 rounded-full bg-err shadow-[0_0_0_2px_var(--sf)] max-md:shadow-[0_0_0_2px_var(--bg)]"
        />
      )}
    </Link>
  );
}
