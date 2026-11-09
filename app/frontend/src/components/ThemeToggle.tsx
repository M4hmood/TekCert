'use client';

import { Icon, IconButton } from '@tekcert/ui';
import type { MouseEvent } from 'react';
import { THEME_COOKIE, writePreference } from '@/lib/preferences';

function resolvedTheme(): 'light' | 'dark' {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let latestSwitch: ViewTransition | null = null;

/**
 * Going light, the new theme spreads in a circle from the button; going dark, the light page
 * shrinks back into it (styles in animations.css). Browsers without view transitions, and people
 * who prefer reduced motion, get the new theme at once.
 */
function applyTheme(theme: 'light' | 'dark', button: HTMLElement) {
  const root = document.documentElement;
  const apply = () => {
    root.dataset.theme = theme;
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reducedMotion) {
    apply();
    return;
  }

  const box = button.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  // Far enough to reach the corner of the screen furthest from the button.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);
  root.style.setProperty('--theme-radius', `${radius}px`);
  root.dataset.themeSwitching = `to-${theme}`;

  const current = document.startViewTransition(apply);
  latestSwitch = current;
  void current.finished.finally(() => {
    // A second click replaces this animation; the settings then belong to the newer one.
    if (latestSwitch !== current) return;
    delete root.dataset.themeSwitching;
    for (const name of ['--theme-x', '--theme-y', '--theme-radius']) {
      root.style.removeProperty(name);
    }
  });
}

export function ThemeToggle() {
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next, event.currentTarget);
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
