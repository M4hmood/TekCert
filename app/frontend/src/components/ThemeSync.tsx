'use client';

import { useEffect, useRef } from 'react';
import { type ThemePreference, THEME_COOKIE, writePreference } from '@/lib/preferences';
import { saveThemeToAccount } from '@/lib/shell-context';
import { applyTheme } from '@/lib/theme';

export interface ThemeSyncProps {
  /** The theme saved on the account; null when the student never chose one. */
  account: ThemePreference | null;
  /** The theme cookie of this browser, if any. */
  cookie: ThemePreference | null;
}

/**
 * Makes this browser and the account agree on the theme, once per visit:
 * - the account has a theme: this browser takes it (a new device opens in the saved theme);
 * - it has none yet but this browser does (chosen before signing in): the account takes it.
 */
export function ThemeSync({ account, cookie }: ThemeSyncProps) {
  const done = useRef(false);
  useEffect(() => {
    // Once: after that the student's own clicks decide, and a later re-render of the layout
    // with an older answer from the server must not undo them.
    if (done.current) return;
    done.current = true;
    if (account) {
      if (account !== cookie) writePreference(THEME_COOKIE, account);
      applyTheme(account);
    } else if (cookie) {
      saveThemeToAccount(cookie);
    }
  }, [account, cookie]);
  return null;
}
