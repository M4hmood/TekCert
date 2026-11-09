'use client';

import { Icon, IconButton } from '@tekcert/ui';
import type { MouseEvent } from 'react';
import { playDeluminator } from '@/lib/deluminator';
import { preloadDeluminatorSounds } from '@/lib/deluminator-sound';
import { THEME_COOKIE, writePreference } from '@/lib/preferences';

function resolvedTheme(): 'light' | 'dark' {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    // A change is already playing; it only lasts about a second.
    if (root.dataset.themeSwitching !== undefined) return;
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    playDeluminator(next, event.currentTarget, () => {
      root.dataset.theme = next;
    });
    writePreference(THEME_COOKIE, next);
  };

  return (
    <IconButton
      label="Change theme"
      onClick={toggle}
      onPointerEnter={preloadDeluminatorSounds}
      onFocus={preloadDeluminatorSounds}
      className="border-ln2 bg-sf max-md:border-transparent max-md:bg-transparent"
    >
      <Icon name="dark_mode" className="dark:hidden" />
      <Icon name="light_mode" className="hidden dark:inline" />
    </IconButton>
  );
}
