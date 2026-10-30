import {
  CertificationListSchema,
  type MyCertificationStatus,
  MyCertificationsSchema,
  parseCatalogQuery,
} from '@tekcert/types';
import { Alert } from '@tekcert/ui';
import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/CatalogView';
import { PageHeader } from '@/components/PageHeader';
import { apiGet } from '@/lib/api';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'Catalog' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CatalogPage({ searchParams }: Props) {
  const query = parseCatalogQuery(await searchParams);
  const [catalog, mine] = await Promise.all([
    apiGet('/certifications', CertificationListSchema).catch(() => null),
    // The pills are a nice-to-have: the catalog still shows without them.
    getAsStudent('/me/certifications', MyCertificationsSchema).catch(() => null),
  ]);
  const statuses: Record<string, MyCertificationStatus> = Object.fromEntries(
    (mine?.items ?? []).map((item) => [item.slug, item.status]),
  );

  return (
    <>
      <PageHeader
        title="Catalog"
        description="Every certification funded by TEK-UP this academic year."
      />
      {catalog ? (
        <CatalogView certifications={catalog.items} initialQuery={query} mine={statuses} />
      ) : (
        <Alert tone="error">
          The catalog could not be loaded right now. Reload the page to try again.
        </Alert>
      )}
    </>
  );
}
