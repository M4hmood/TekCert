import { CatalogSkeleton } from '@/components/catalog/CatalogSkeleton';
import { PageHeader } from '@/components/PageHeader';

export default function CatalogLoading() {
  return (
    <>
      <PageHeader
        title="Catalog"
        description="Every certification funded by TEK-UP this academic year."
      />
      <CatalogSkeleton />
    </>
  );
}
