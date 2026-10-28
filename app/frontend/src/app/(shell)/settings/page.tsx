import type { Metadata } from 'next';
import { Placeholder } from '@/components/Placeholder';
import { SettingRow } from '@/components/SettingRow';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <>
      <Placeholder title="Settings" overline="My space" icon="settings" arrives="Sprint 7">
        Account, privacy and notification preferences. This screen is built in Sprint 7.
      </Placeholder>
      <SettingRow title="Sign out" meta="On this device" action={<SignOutButton />} />
    </>
  );
}
