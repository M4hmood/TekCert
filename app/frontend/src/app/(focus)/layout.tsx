import type { ReactNode } from 'react';
import styles from './focus.module.css';

export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={styles.focus}>
      {children}
    </main>
  );
}
