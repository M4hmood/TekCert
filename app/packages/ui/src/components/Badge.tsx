import styles from './Badge.module.css';

export interface BadgeProps {
  count: number;
  /** Spoken text, e.g. "3 unread". The visible count is hidden from screen readers. */
  label: string;
}

export function Badge({ count, label }: BadgeProps) {
  return (
    <span className={styles.badge}>
      <span aria-hidden>{count}</span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
