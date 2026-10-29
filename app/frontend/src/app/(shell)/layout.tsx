import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { parseSidebarCollapsed, SIDEBAR_COOKIE } from '@/lib/preferences';
import { getCurrentUser } from '@/lib/session';
import styles from './shell.module.css';

/** App shell: Sidebar on desktop and tablet, BottomNav on phones. Signed-in students only. */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  // proxy.ts already redirects visitors without a session; this catches revoked or forged tokens.
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  const collapsed = parseSidebarCollapsed((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <Sidebar initiallyCollapsed={collapsed} user={user} />
      <main id="main" className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
