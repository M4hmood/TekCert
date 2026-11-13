import { SpecialtyLeaderboardSchema, StudentLeaderboardSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { boardPath, parseBoardFilters } from '@/components/leaderboard/format';
import { LeaderboardView } from '@/components/leaderboard/LeaderboardView';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'Leaderboard' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LeaderboardPage({ searchParams }: Props) {
  const filters = parseBoardFilters(await searchParams);
  // The students board is always loaded: it carries the scope labels and my position.
  const [students, specialties] = await Promise.all([
    getAsStudent(boardPath({ ...filters, view: 'students' }), StudentLeaderboardSchema).catch(
      () => null,
    ),
    filters.view === 'specialties'
      ? getAsStudent(boardPath(filters), SpecialtyLeaderboardSchema).catch(() => null)
      : null,
  ]);
  return (
    <LeaderboardView
      initialFilters={filters}
      initialStudents={students}
      initialSpecialties={specialties}
      now={new Date().toISOString()}
    />
  );
}
