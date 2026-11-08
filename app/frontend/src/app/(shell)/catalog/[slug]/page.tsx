import {
  CertificationCommunitySchema,
  CertificationDetailSchema,
  CommunityQuerySchema,
  type MyCertificationStatus,
  MyCertificationsSchema,
  SlugSchema,
} from '@tekcert/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CertificationView } from '@/components/certification/CertificationView';
import { CommunityPanel } from '@/components/certification/CommunityPanel';
import { CertHeader, CertTopBar } from '@/components/certification/header';
import { OverviewPanel, SyllabusPanel } from '@/components/certification/panels';
import { ResourcesPanel } from '@/components/certification/ResourcesPanel';
import { communitySearch, parseTab } from '@/components/certification/tabs';
import { ApiError, apiGet } from '@/lib/api';
import { getAsStudent } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Cached per request: the metadata and the page share one API call. */
const loadCertification = cache(async (slug: string) => {
  if (!SlugSchema.safeParse(slug).success) notFound();
  try {
    return await apiGet(`/certifications/${slug}`, CertificationDetailSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await loadCertification((await params).slug);
  return { title: `${cert.code} · ${cert.name}` };
}

export default async function CertificationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  // Checked before building any API path from it.
  if (!SlugSchema.safeParse(slug).success) notFound();
  const search = await searchParams;
  const parsedQuery = CommunityQuerySchema.safeParse(search);
  const communityQuery = parsedQuery.success ? parsedQuery.data : { scope: 'institute' as const };
  const communityPath = `/certifications/${slug}/community?${communitySearch(communityQuery)}`;

  const [cert, mine, community] = await Promise.all([
    loadCertification(slug),
    getAsStudent('/me/certifications', MyCertificationsSchema).catch(() => null),
    getAsStudent(communityPath, CertificationCommunitySchema).catch(() => null),
  ]);
  const statuses: Record<string, MyCertificationStatus> = Object.fromEntries(
    (mine?.items ?? []).map((item) => [item.slug, item.status]),
  );

  return (
    <CertificationView
      slug={cert.slug}
      code={cert.code}
      topBar={<CertTopBar cert={cert} />}
      header={<CertHeader cert={cert} />}
      initialTab={parseTab(search.tab)}
      initialStatus={mine?.items.find((item) => item.slug === cert.slug) ?? null}
      preparingCount={cert.preparingCount}
      counts={{
        syllabus: cert.chapterCount,
        resources: cert.resources.length,
        ...(community && { community: community.earned.total + community.preparing.total }),
      }}
      panels={{
        overview: <OverviewPanel cert={cert} mine={statuses} />,
        syllabus: <SyllabusPanel cert={cert} />,
        resources: <ResourcesPanel resources={cert.resources} />,
        community: (
          <CommunityPanel slug={cert.slug} initialQuery={communityQuery} initialData={community} />
        ),
      }}
    />
  );
}
