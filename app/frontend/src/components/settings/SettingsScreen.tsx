import { NotificationPreferencesSchema, SettingsSchema } from '@tekcert/types';
import { Alert } from '@tekcert/ui';
import { cookies } from 'next/headers';
import { SettingRow } from '@/components/SettingRow';
import { SignOutButton } from '@/components/SignOutButton';
import { readThemeCookie, THEME_COOKIE } from '@/lib/preferences';
import { getAsStudent } from '@/lib/session';
import { AccountSection } from './AccountSection';
import { AppearanceSection } from './AppearanceSection';
import { EnrolmentSection } from './EnrolmentSection';
import { NotificationPrefsSection } from './NotificationPrefsSection';
import { PrivacySection } from './PrivacySection';
import type { SettingsSection } from './sections';

/** One section of Settings, loaded for the student asking. Rendered on the server. */
export async function SettingsScreen({ section }: { section: SettingsSection }) {
  const [settings, preferences] = await Promise.all([
    getAsStudent('/me/settings', SettingsSchema).catch(() => null),
    section === 'notifications'
      ? getAsStudent('/me/notification-preferences', NotificationPreferencesSchema).catch(
          () => null,
        )
      : null,
  ]);
  if (!settings || (section === 'notifications' && !preferences)) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">
          Your settings couldn’t be loaded right now. Reload the page to try again.
        </Alert>
        {/* Signing out must stay possible even when the rest can't load. */}
        <SettingRow title="Sign out" meta="On this device" action={<SignOutButton />} />
      </div>
    );
  }

  switch (section) {
    case 'account':
      return <AccountSection account={settings.account} />;
    case 'enrolment':
      return settings.enrolment ? (
        <EnrolmentSection
          enrolment={settings.enrolment}
          alumni={settings.alumni}
          academicYear={settings.academicYear}
          specialties={settings.specialties}
          firstName={settings.account.firstName}
        />
      ) : null;
    case 'privacy':
      return <PrivacySection privacy={settings.privacy} />;
    case 'notifications':
      return <NotificationPrefsSection initial={preferences?.items ?? []} />;
    case 'appearance':
      return (
        <AppearanceSection
          initial={
            settings.theme ??
            readThemeCookie((await cookies()).get(THEME_COOKIE)?.value) ??
            'system'
          }
        />
      );
  }
}
