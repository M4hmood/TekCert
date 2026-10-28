import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'My profile' };

export default function Page() {
  return (
    <Placeholder title="My profile" overline="My space" icon="person" arrives="Sprint 2">
      Your certifications, path and visibility settings. This screen is built in Sprint 2.
    </Placeholder>
  );
}
