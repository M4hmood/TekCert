'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './auth.module.css';

const TABS = [
  { href: '/sign-in', label: 'Sign in' },
  { href: '/sign-up', label: 'Sign up' },
] as const;

/**
 * "Sign in | Sign up" switch. Each tab is its own URL, so either can be linked to directly.
 * It lives in the auth layout, which stays mounted between the two pages, so the white pill
 * slides from one tab to the other.
 */
export function AuthTabs() {
  const pathname = usePathname();
  const next = useSearchParams().get('next');
  const active = TABS.findIndex((tab) => tab.href === pathname);
  if (active === -1) return null;

  const query = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <nav
      aria-label="Account"
      className={styles.tabs}
      data-active={active}
      // Own layer during page transitions, so the live tab bar (and its sliding pill) shows through
      // instead of being cross-faded. Inline because CSS Modules would rename it.
      style={{ viewTransitionName: 'auth-tabs' }}
    >
      <span className={styles.tabIndicator} aria-hidden />
      {TABS.map((tab, i) => (
        <Link
          key={tab.href}
          href={`${tab.href}${query}`}
          className={styles.tab}
          aria-current={i === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
