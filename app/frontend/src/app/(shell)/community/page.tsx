import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Community' };

export default function Page() {
  return (
    <Placeholder title="Community" icon="groups" arrives="Sprint 5">
      Find classmates who hold or are preparing a certification. This screen is built in Sprint 5.
    </Placeholder>
  );
}
