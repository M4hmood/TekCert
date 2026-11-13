'use client';

import { Icon, IconButton } from '@tekcert/ui';
import type { MouseEvent } from 'react';
import { THEME_COOKIE, writePreference } from '@/lib/preferences';
import { saveThemeToAccount, useShell } from '@/lib/shell-context';
import { applyTheme, resolvedTheme } from '@/lib/theme';

/**
 * Switches between light and dark. The choice goes in a cookie for the first paint and, for a
 * signed-in student, on their account so their other devices follow.
 */
export function ThemeToggle() {
  const { signedIn } = useShell();
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next, event.currentTarget);
    writePreference(THEME_COOKIE, next);
    if (signedIn) saveThemeToAccount(next);
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
