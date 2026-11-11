import { StudentParamsSchema, StudentProfileSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { ProfileView } from '@/components/community/ProfileView';
import { ApiError } from '@/lib/api';
import { getAsStudent } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/** Cached per request: the metadata and the page share one API call. */
const loadProfile = cache(async (id: string) => {
  // Checked before building any API path from it.
  if (!StudentParamsSchema.safeParse({ id }).success) notFound();
  try {
    return await getAsStudent(`/community/students/${id}`, StudentProfileSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await loadProfile((await params).id);
  return { title: `${profile.firstName} ${profile.lastName}` };
}

export default async function StudentProfilePage({ params }: Props) {
  const profile = await loadProfile((await params).id);
  // My own profile lives at /profile, with my settings.
  if (profile.isMe) redirect('/profile');
  return <ProfileView profile={profile} now={new Date().toISOString()} />;
}
