import { DEFAULT_SECTION } from '@/components/settings/sections';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { SettingRow } from '@/components/SettingRow';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * Desktop opens on the first section next to the list. Phones show the list alone here (the
 * section is hidden) and open each section on its own page; signing out stays one tap away.
 */
export default function SettingsPage() {
  return (
    <>
      <div className="max-md:hidden">
        <SettingsScreen section={DEFAULT_SECTION} />
      </div>
      <div className="hidden mt-4 max-md:block">
        <SettingRow title="Sign out" meta="On this device" action={<SignOutButton />} />
      </div>
    </>
  );
}
