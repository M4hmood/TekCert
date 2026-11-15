import { CertificationListSchema, PublicStatsSchema } from '@tekcert/types';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';
import { apiGet } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: { absolute: 'TekCert · IT certifications for TEK-UP students' },
  description:
    'The IT certifications TEK-UP funds, a path for your specialty, and the classmates preparing the same one.',
};
export const dynamic = 'force-dynamic';

/**
 * The public landing page (design/Landing). proxy.ts already sends signed-in students to their
 * dashboard; the check here covers a session it couldn't read.
 */
export default async function Home() {
  if (await getCurrentUser().catch(() => null)) redirect('/dashboard');
  // The page explains TekCert even when the API is down: the numbers and the catalog are extras.
  const [stats, catalog] = await Promise.all([
    apiGet('/stats/public', PublicStatsSchema).catch(() => null),
    apiGet('/certifications', CertificationListSchema).catch(() => null),
  ]);
  return (
    <LandingPage stats={stats} catalog={catalog?.items ?? null} now={new Date().toISOString()} />
  );
}
