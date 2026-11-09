'use client';

import { Button, EmptyState } from '@tekcert/ui';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
