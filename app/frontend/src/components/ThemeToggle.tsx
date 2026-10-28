'use client';

import { Icon, IconButton } from '@tekcert/ui';
import { THEME_COOKIE, writePreference } from '@/lib/preferences';
import styles from './ThemeToggle.module.css';

function resolvedTheme(): 'light' | 'dark' {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const toggle = () => {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    writePreference(THEME_COOKIE, next);
  };

  return (
    <IconButton label="Change theme" onClick={toggle} className={styles.toggle}>
      <Icon name="dark_mode" className={styles.toDark} />
      <Icon name="light_mode" className={styles.toLight} />
    </IconButton>
  );
}
