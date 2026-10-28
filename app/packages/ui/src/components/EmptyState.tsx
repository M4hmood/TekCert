import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Dashed card used when a screen or list has nothing to show (Catalogue "No certification matches"). */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <Icon name={icon} size={30} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.body}>{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
