'use client';

import { Button, buttonClass } from '@tekcert/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { errorCode } from '@/components/dashboard/DashboardError';
import { SchoolLogo } from '@/components/SchoolLogo';
import { StatusScreen } from '@/components/StatusScreen';
import { reportError } from '@/lib/monitoring';

const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Tunis',
});

/**
 * A screen failed to render, most often because the API couldn't be reached. It replaces the
 * whole app, so it brings its own header. "Try again" uses `retry`, which fetches the server data
 * again: `reset` would only re-render the same failure.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [at] = useState(() => timeFormat.format(new Date()));
  useEffect(() => reportError(error), [error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center px-8 py-4 border-b border-ln max-md:px-4 max-md:py-3">
        <Link href="/" className="flex items-center gap-2.5 min-h-11 text-ink no-underline">
          <Image
            src="/icons/tekcert-96.png"
            alt=""
            width={32}
            height={32}
            className="size-8 object-contain"
          />
          <span className="font-serif text-[22px] font-semibold">TekCert</span>
          <span className="flex items-center ms-0.5 ps-3 border-s border-ln2">
            <SchoolLogo className="h-9 max-md:h-8" />
          </span>
          <span className="sr-only"> home</span>
        </Link>
      </header>

      <main id="main" className="flex flex-1 flex-col">
        <StatusScreen
          icon="cloud_off"
          tone="error"
          title="Something went wrong"
          actions={
            <>
              <Button
                icon="refresh"
                onClick={() => startTransition(() => retry())}
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? 'Trying again…' : 'Try again'}
              </Button>
              <Link href="/dashboard" className={buttonClass('secondary')}>
                Go to the dashboard
              </Link>
            </>
          }
          footnote={`Code ${errorCode(error)} · ${at}`}
        >
          This page couldn&apos;t be displayed, usually because TekCert couldn&apos;t be reached for
          a moment. Your progress is saved, nothing is lost.
        </StatusScreen>
      </main>
    </div>
  );
}
