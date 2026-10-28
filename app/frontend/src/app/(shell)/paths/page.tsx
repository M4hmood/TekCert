import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Paths' };

export default function Page() {
  return (
    <Placeholder title="Paths" icon="route" arrives="Release 2">
      Follow the recommended path for your specialty, certification by certification. This screen is
      built in Release 2.
    </Placeholder>
  );
}
