import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return (
    <Placeholder title="Notifications" overline="My space" icon="notifications" arrives="Sprint 7">
      Updates about your certifications and your classmates. This screen is built in Sprint 7.
    </Placeholder>
  );
}
