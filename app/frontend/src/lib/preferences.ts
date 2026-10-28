/** UI preferences stored in cookies so the server renders the right theme and sidebar on first paint. */

export const THEME_COOKIE = 'theme';
export const SIDEBAR_COOKIE = 'sidebar';

export type ThemePreference = 'light' | 'dark' | 'system';

export function parseTheme(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === 'collapsed';
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Client-side only. */
export function writePreference(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
