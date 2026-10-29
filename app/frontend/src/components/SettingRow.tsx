import type { ReactNode } from 'react';
import styles from './SettingRow.module.css';

export function SettingRow({
  title,
  meta,
  action,
}: {
  title: string;
  meta: string;
  action: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>{meta}</span>
      </span>
      {action}
    </div>
  );
}
