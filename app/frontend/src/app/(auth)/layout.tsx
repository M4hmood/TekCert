import { CertificationListSchema } from '@tekcert/types';
import { type ReactNode, Suspense } from 'react';
import styles from '@/components/auth/auth.module.css';
import { AuthContent } from '@/components/auth/AuthContent';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { BadgeWall } from '@/components/auth/BadgeWall';
import { ThemeToggle } from '@/components/ThemeToggle';
import { apiGet } from '@/lib/api';

/** Until verified certifications exist (Release 2), the hero shows the size of the funded catalog. */
async function catalogSize(): Promise<number | null> {
  try {
    return (await apiGet('/certifications', CertificationListSchema)).total;
  } catch {
    return null;
  }
}

/** design/Connexion.dc.html: hero panel with the badge wall, form column on the right. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const total = await catalogSize();
  return (
    <div className={styles.page}>
      <aside className={styles.hero}>
        <span className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            T
          </span>
          <span className={styles.brandName}>TekCert</span>
        </span>
        <div className={styles.heroBody}>
          <p className={styles.headline}>
            Your class is moving ahead. <em>Join it.</em>
          </p>
          <BadgeWall />
        </div>
        {total !== null && (
          <span className={styles.stat}>{total} certifications funded by the institute.</span>
        )}
      </aside>
      <main id="main" className={styles.main}>
        <div className={styles.toolbar}>
          <ThemeToggle />
        </div>
        <div className={styles.center}>
          <div className={styles.column}>
            {/* Tabs live here, not in the pages, so they stay mounted and the pill can slide. */}
            <Suspense>
              <AuthTabs />
            </Suspense>
            <AuthContent>{children}</AuthContent>
          </div>
        </div>
      </main>
    </div>
  );
}
