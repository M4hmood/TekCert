import type { ThemePreference } from './preferences';

/** Browser-side only: reading and changing the theme on <html>. */

export function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** What the page shows now: the forced theme, else the device's. */
export function resolvedTheme(): 'light' | 'dark' {
  const forced = document.documentElement.dataset.theme;
  return forced === 'light' || forced === 'dark' ? forced : systemTheme();
}

/** The choice on <html>: a forced theme, or "system" when nothing is forced. */
export function currentPreference(): ThemePreference {
  const forced = document.documentElement.dataset.theme;
  return forced === 'light' || forced === 'dark' ? forced : 'system';
}

let latestSwitch: ViewTransition | null = null;

/**
 * Applies a theme choice. When the colours change and `origin` is given, going light spreads
 * the new theme in a circle from it and going dark shrinks the light page back into it (styles
 * in animations.css). Browsers without view transitions, and people who prefer reduced motion,
 * get the new theme at once.
 */
export function applyTheme(preference: ThemePreference, origin?: HTMLElement): void {
  const root = document.documentElement;
  const apply = () => {
    if (preference === 'system') delete root.dataset.theme;
    else root.dataset.theme = preference;
  };
  const target = preference === 'system' ? systemTheme() : preference;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (
    !origin ||
    target === resolvedTheme() ||
    typeof document.startViewTransition !== 'function' ||
    reducedMotion
  ) {
    apply();
    return;
  }

  const box = origin.getBoundingClientRect();
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
  root.dataset.themeSwitching = `to-${target}`;

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
