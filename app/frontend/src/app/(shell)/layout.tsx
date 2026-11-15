import { SettingsSchema, UnreadCountSchema } from '@tekcert/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { YearPromptLazy } from '@/components/settings/YearPromptLazy';
import { Sidebar } from '@/components/Sidebar';
import { ThemeSync } from '@/components/ThemeSync';
import {
  parseSidebarCollapsed,
  readThemeCookie,
  SIDEBAR_COOKIE,
  THEME_COOKIE,
  YEAR_PROMPT_COOKIE,
} from '@/lib/preferences';
import { getAsStudent, getCurrentUser } from '@/lib/session';
import { ShellProvider } from '@/lib/shell-context';

/** App shell: Sidebar on desktop and tablet, BottomNav on phones. Signed-in students only. */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  // proxy.ts already redirects visitors without a session; this catches revoked or forged tokens.
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  // Every app screen needs the class and path chosen in onboarding.
  if (!user.onboardingCompleted) redirect('/onboarding');
  const jar = await cookies();
  const collapsed = parseSidebarCollapsed(jar.get(SIDEBAR_COOKIE)?.value);
  // The prompt is asked once a year and "Remind me tomorrow" hides it for a day on this device;
  // neither it nor the unread count may keep a screen from rendering.
  const askYear = user.yearPromptDue && !jar.has(YEAR_PROMPT_COOKIE);
  const [unread, settings] = await Promise.all([
    getAsStudent('/me/notifications/unread-count', UnreadCountSchema).catch(() => ({ unread: 0 })),
    askYear ? getAsStudent('/me/settings', SettingsSchema).catch(() => null) : null,
  ]);
  return (
    <ShellProvider unread={unread.unread}>
      <ThemeSync account={user.theme} cookie={readThemeCookie(jar.get(THEME_COOKIE)?.value)} />
      <div className="flex min-h-dvh">
        <a
          href="#main"
          className="absolute top-2 start-2 z-20 px-3.5 py-2.5 rounded-field bg-pri text-pri-ink font-semibold -translate-y-[200%] focus:translate-y-0"
        >
          Skip to content
        </a>
        <Sidebar initiallyCollapsed={collapsed} user={user} />
        <main
          id="main"
          className="flex flex-1 flex-col gap-7 min-w-0 px-10 pt-8 pb-12 max-md:gap-4 max-md:px-4 max-md:pt-5 max-md:pb-[calc(var(--bottom-nav-height)+24px)]"
        >
          {children}
        </main>
        <BottomNav />
        {settings?.academicYear.due && settings.enrolment && (
          <YearPromptLazy
            firstName={user.firstName}
            enrolment={settings.enrolment}
            specialties={settings.specialties}
            yearLabel={settings.academicYear.label}
            defaultOpen
          />
        )}
      </div>
    </ShellProvider>
  );
}
