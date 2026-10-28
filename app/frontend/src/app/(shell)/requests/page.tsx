import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'My requests' };

export default function Page() {
  return (
    <Placeholder title="My requests" overline="My space" icon="assignment" arrives="Release 2">
      Ask for an exam seat and follow your requests here. This screen is built in Release 2.
    </Placeholder>
  );
}
