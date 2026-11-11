import { DirectorySkeleton } from '@/components/community/skeletons';
import { PageHeader } from '@/components/PageHeader';

export default function CommunityLoading() {
  return (
    <>
      <PageHeader
        title="Community"
        description="Find who's preparing or holds a certification, and ask them for advice."
      />
      <DirectorySkeleton />
    </>
  );
}
