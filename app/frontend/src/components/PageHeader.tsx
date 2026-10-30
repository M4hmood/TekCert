import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';
import { ThemeToggle } from './ThemeToggle';

export interface PageHeaderProps {
  title: string;
  /** Small line above the title, e.g. the date or a section name. */
  overline?: string;
  /** Line under the title, e.g. "Every certification funded by TEK-UP…". Hidden on phones. */
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, overline, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        {overline && <span className={styles.overline}>{overline}</span>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.actions}>
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
