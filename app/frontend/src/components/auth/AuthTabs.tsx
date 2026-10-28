import Link from 'next/link';
import styles from './auth.module.css';

/** "Sign in | Sign up" switch. Each tab is its own URL, so either can be linked to directly. */
export function AuthTabs({ active, next }: { active: 'sign-in' | 'sign-up'; next?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <nav aria-label="Account" className={styles.tabs}>
      <Link
        href={`/sign-in${query}`}
        className={styles.tab}
        aria-current={active === 'sign-in' ? 'page' : undefined}
      >
        Sign in
      </Link>
      <Link
        href={`/sign-up${query}`}
        className={styles.tab}
        aria-current={active === 'sign-up' ? 'page' : undefined}
      >
        Sign up
      </Link>
    </nav>
  );
}
