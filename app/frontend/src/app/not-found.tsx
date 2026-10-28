import { buttonClass, EmptyState } from '@tekcert/ui';
import Link from 'next/link';
import styles from './(focus)/focus.module.css';

export default function NotFound() {
  return (
    <main id="main" className={styles.focus}>
      <EmptyState
        icon="search_off"
        title="Page not found"
        action={
          <Link href="/dashboard" className={buttonClass('primary')}>
            Back to the dashboard
          </Link>
        }
      >
        The page you are looking for does not exist or has moved.
      </EmptyState>
    </main>
  );
}
