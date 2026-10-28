'use client';

import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BOTTOM_NAV, isActive } from '@/lib/navigation';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className={styles.nav}>
      {BOTTOM_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.tab}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.pill}>
              <Icon name={item.icon} filled={active} size={22} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
