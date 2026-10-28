import { CertificationListSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';
import { apiGet } from '@/lib/api';

export const metadata: Metadata = { title: 'Catalog' };
export const dynamic = 'force-dynamic';

async function catalogSize(): Promise<number | null> {
  try {
    return (await apiGet('/certifications', CertificationListSchema)).total;
  } catch {
    return null;
  }
}

export default async function CatalogPage() {
  const total = await catalogSize();
  return (
    <Placeholder title="Catalog" icon="menu_book" arrives="Sprint 3">
      {total === null
        ? 'The catalog could not be loaded right now.'
        : `${total} certifications funded by the institute are ready.`}{' '}
      Browsing and filters are built in Sprint 3.
    </Placeholder>
  );
}
