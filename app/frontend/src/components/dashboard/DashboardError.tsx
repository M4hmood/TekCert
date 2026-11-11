'use client';

import { Button, Icon } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Tunis',
});

/** A short code for support: the HTTP status when the API said one, else a network error. */
export function errorCode(error: Error & { digest?: string }): string {
  const status = /\b([45]\d\d)\b/.exec(error.message)?.[1];
  if (status) return `ERR_HTTP_${status}`;
  return error.digest ? `ERR_${error.digest.slice(0, 8).toUpperCase()}` : 'ERR_NETWORK';
}

export function DashboardError({
  error,
  onRetry,
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [at] = useState(() => timeFormat.format(new Date()));

  // Server data has to be fetched again, not only the boundary reset.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      onRetry();
    });

  return (
    <section
      aria-labelledby="dashboard-error"
      className="flex flex-1 flex-col items-center justify-center gap-3.5 p-6 text-center"
    >
      <span className="grid place-items-center size-16 rounded-full bg-err-sf text-err">
        <Icon name="cloud_off" size={30} />
      </span>
      <h1 id="dashboard-error" className="font-serif text-[24px] font-semibold">
        Couldn&apos;t load your dashboard
      </h1>
      <p className="max-w-90 text-ink2 text-[14.5px] leading-[1.55]">
        Check your connection. Your progress is saved, nothing is lost.
      </p>
      <Button
        icon="refresh"
        onClick={retry}
        disabled={pending}
        aria-busy={pending}
        className="mt-1.5"
      >
        Try again
      </Button>
      <span className="text-ink3 font-mono text-[12px]">
        Code {errorCode(error)} · {at}
      </span>
    </section>
  );
}
