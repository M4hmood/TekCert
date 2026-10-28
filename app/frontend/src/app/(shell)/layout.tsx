import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { parseSidebarCollapsed, SIDEBAR_COOKIE } from '@/lib/preferences';
import styles from './shell.module.css';

/** App shell: Sidebar on desktop and tablet, BottomNav on phones. */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const collapsed = parseSidebarCollapsed((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <Sidebar initiallyCollapsed={collapsed} />
      <main id="main" className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
