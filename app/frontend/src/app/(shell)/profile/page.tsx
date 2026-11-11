import { StudentProfileSchema } from '@tekcert/types';
import { Alert, buttonClass } from '@tekcert/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProfileView } from '@/components/community/ProfileView';
import { PageHeader } from '@/components/PageHeader';
import { SettingRow } from '@/components/SettingRow';
import { getAsStudent } from '@/lib/session';

export const metadata: Metadata = { title: 'My profile' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const profile = await getAsStudent('/me/profile', StudentProfileSchema).catch(() => null);
  if (!profile) {
    return (
      <>
        <PageHeader title="My profile" overline="My space" />
        <Alert tone="error">
          Your profile couldn&apos;t be loaded right now. Reload the page to try again.
        </Alert>
        {/* The phone's tab bar has no Settings tab: keep the way to Settings and Sign out. */}
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
  return <ProfileView profile={profile} now={new Date().toISOString()} />;
}
