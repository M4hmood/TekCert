'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, ViewTransition } from 'react';

/**
 * Switching between auth pages (sign in ↔ sign up, sign in → forgot password) is a route
 * navigation, which React runs as a transition. Keying on the path makes the old and new forms
 * an exit/enter pair: they crossfade while the box morphs to the new height (styles in
 * auth.module.css). Browsers without the View Transitions API simply swap the content.
 */
export function AuthContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      name="auth-content"
      share="auth-swap"
      enter="auth-swap"
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
