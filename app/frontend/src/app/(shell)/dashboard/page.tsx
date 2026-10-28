import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return (
    <Placeholder title="Dashboard" icon="space_dashboard" arrives="Sprint 4">
      Your current certification, level and path will appear here. This screen is built in Sprint 4.
    </Placeholder>
  );
}
