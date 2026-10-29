import { buttonClass } from '@tekcert/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Placeholder } from '@/components/Placeholder';
import { SettingRow } from '@/components/SettingRow';

export const metadata: Metadata = { title: 'My profile' };

export default function Page() {
  return (
    <>
      <Placeholder title="My profile" overline="My space" icon="person" arrives="Sprint 2">
        Your certifications, path and visibility settings. This screen is built in Sprint 2.
      </Placeholder>
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
