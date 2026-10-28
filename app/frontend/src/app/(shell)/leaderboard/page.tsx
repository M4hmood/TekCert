import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function Page() {
  return (
    <Placeholder title="Leaderboard" icon="leaderboard" arrives="Sprint 6">
      Rankings by class, specialty and level. This screen is built in Sprint 6.
    </Placeholder>
  );
}
