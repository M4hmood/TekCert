'use client';

import { Button, EmptyState } from '@tekcert/ui';
import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportError(error), [error]);
  return (
    <main id="main" className="flex flex-col min-h-dvh">
      <EmptyState
        icon="error"
        title="Something went wrong"
        action={
          <Button icon="refresh" onClick={reset}>
            Try again
          </Button>
        }
      >
        The page could not be displayed. Try again in a moment.
      </EmptyState>
    </main>
  );
}
