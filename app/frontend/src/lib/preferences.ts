/** UI preferences stored in cookies so the server renders the right theme and sidebar on first paint. */

export const THEME_COOKIE = 'theme';
export const SIDEBAR_COOKIE = 'sidebar';
export const SPLASH_COOKIE = 'splash_seen';
/** Set by "Remind me tomorrow" on the academic-year prompt. */
export const YEAR_PROMPT_COOKIE = 'year_prompt_snoozed';

export type ThemePreference = 'light' | 'dark' | 'system';

export function parseTheme(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** The cookie as it was written: null when this browser never chose a theme. */
export function readThemeCookie(value: string | undefined): ThemePreference | null {
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === 'collapsed';
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Client-side only. */
export function writePreference(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** Client-side only. No max-age: the browser forgets it when it closes, so the splash returns. */
export function markSplashSeen(): void {
  document.cookie = `${SPLASH_COOKIE}=1; path=/; samesite=lax`;
}

const ONE_DAY = 60 * 60 * 24;

/** Client-side only. Hides the academic-year prompt on this device for a day. */
export function snoozeYearPrompt(): void {
  document.cookie = `${YEAR_PROMPT_COOKIE}=1; path=/; max-age=${ONE_DAY}; samesite=lax`;
}
