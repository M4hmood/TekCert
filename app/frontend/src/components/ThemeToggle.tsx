'use client';

import { Icon, IconButton } from '@tekcert/ui';
import { THEME_COOKIE, writePreference } from '@/lib/preferences';

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
    <IconButton
      label="Change theme"
      onClick={toggle}
      className="border-ln2 bg-sf max-md:border-transparent max-md:bg-transparent"
    >
      <Icon name="dark_mode" className="dark:hidden" />
      <Icon name="light_mode" className="hidden dark:inline" />
    </IconButton>
  );
}
