import { CertificationDetailSchema, SlugSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Placeholder } from '@/components/Placeholder';
import { ApiError, apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function loadCertification(slug: string) {
  if (!SlugSchema.safeParse(slug).success) notFound();
  try {
    return await apiGet(`/certifications/${slug}`, CertificationDetailSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.toUpperCase() };
}

export default async function CertificationPage({ params }: Props) {
  const cert = await loadCertification((await params).slug);
  return (
    <Placeholder
      title={cert.name}
      overline={`${cert.provider.name} · ${cert.code}`}
      icon="workspace_premium"
      arrives="Sprint 3"
    >
      {cert.chapterCount} chapters across {cert.domains.length} exam domains. The full certification
      page is built in Sprint 3.
    </Placeholder>
  );
}
