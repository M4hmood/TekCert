import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { parseSidebarCollapsed, SIDEBAR_COOKIE } from '@/lib/preferences';
import { getCurrentUser } from '@/lib/session';

/** App shell: Sidebar on desktop and tablet, BottomNav on phones. Signed-in students only. */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  // proxy.ts already redirects visitors without a session; this catches revoked or forged tokens.
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  // Every app screen needs the class and path chosen in onboarding.
  if (!user.onboardingCompleted) redirect('/onboarding');
  const collapsed = parseSidebarCollapsed((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
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
    </div>
  );
}
