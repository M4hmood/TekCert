'use client';

import { UnreadCountSchema } from '@tekcert/types';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getJson, patchJson, withSessionRefresh } from './client-api';
import type { ThemePreference } from './preferences';

interface Shell {
  /** Unread notifications: the badge in the sidebar and the dot on the bell. */
  unread: number;
  setUnread: (unread: number) => void;
  /** True inside the app shell: a theme change is then saved on the account too. */
  signedIn: boolean;
}

const ShellContext = createContext<Shell>({ unread: 0, setUnread: () => {}, signedIn: false });

/** What the screens of the shell share. Outside it (sign-in, tests) the defaults apply. */
export function useShell(): Shell {
  return useContext(ShellContext);
}

/**
 * Holds the unread count for the shell. The server gives the first value; it is read again on
 * each navigation, so a notification written meanwhile shows up without a reload.
 */
export function ShellProvider({
  unread: initial,
  children,
}: {
  unread: number;
  children: ReactNode;
}) {
  const [unread, setUnread] = useState(initial);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The server just counted for this first page.
    if (first.current) {
      first.current = false;
      return;
    }
    let stale = false;
    void withSessionRefresh(() =>
      getJson('/me/notifications/unread-count', UnreadCountSchema),
    ).then((result) => {
      if (!stale && result.ok) setUnread(result.data.unread);
    });
    return () => {
      stale = true;
    };
  }, [pathname]);

  const shell = useMemo(() => ({ unread, setUnread, signedIn: true }), [unread]);
  return <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>;
}

/** Keeps the theme on the account, so it follows the student to their other devices. */
export function saveThemeToAccount(theme: ThemePreference): void {
  void withSessionRefresh(() => patchJson('/me/preferences', { theme }));
}
