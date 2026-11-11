'use client';

import { DashboardError } from '@/components/dashboard/DashboardError';

/** The dashboard couldn't load (design: Mobile 390 · error). The shell stays usable. */
export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DashboardError error={error} onRetry={reset} />;
}
