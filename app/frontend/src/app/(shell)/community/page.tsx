import { CertificationListSchema, DirectorySchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { DirectoryView } from '@/components/community/DirectoryView';
import { directorySearch, parseDirectoryFilters } from '@/components/community/format';
import { apiGet } from '@/lib/api';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'Community' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CommunityPage({ searchParams }: Props) {
  const filters = parseDirectoryFilters(await searchParams);
  const search = directorySearch(filters);
  const [directory, catalog] = await Promise.all([
    getAsStudent(`/community/students${search ? `?${search}` : ''}`, DirectorySchema).catch(
      () => null,
    ),
    // Only feeds the "Holds" filter: the directory still works without it.
    apiGet('/certifications', CertificationListSchema).catch(() => null),
  ]);
  const holdable = (catalog?.items ?? [])
    .filter((cert) => cert.earnedCount > 0 || cert.slug === filters.holds)
    .map((cert) => ({ slug: cert.slug, code: cert.code }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return <DirectoryView initialFilters={filters} initial={directory} holdable={holdable} />;
}
