import { MyPointsSchema } from '@tekcert/types';
import { buttonClass, EmptyState } from '@tekcert/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ProfileProgress } from '@/components/progress/ProfileProgress';
import { SettingRow } from '@/components/SettingRow';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'My profile' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const points = await getAsStudent('/me/points', MyPointsSchema).catch(() => null);
  return (
    <>
      <PageHeader title="My profile" overline="My space" />
      {/* S04 brings the level and badges blocks; the rest of the profile arrives in Sprint 5. */}
      {points ? (
        <ProfileProgress points={points} />
      ) : (
        <p role="alert" className="text-err text-[14px]">
          Your level and badges couldn&apos;t be loaded. Reload the page to try again.
        </p>
      )}
      <EmptyState icon="person" title="The rest of your profile is on its way">
        Your certification collection, followed paths and recent activity appear here in Sprint 5.
      </EmptyState>
      {/* The mobile tab bar has no Settings tab, so Settings (and Sign out) are reached from here. */}
      <SettingRow
        title="Settings"
        meta="Account and sign out"
        action={
          <Link href="/settings" className={buttonClass('secondary')}>
            Open settings
          </Link>
        }
      />
    </>
  );
}
