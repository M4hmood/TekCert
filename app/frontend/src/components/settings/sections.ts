/** The sections of Settings, in the order of design/Parametres. Each has its own URL. */
export const SETTINGS_SECTIONS = [
  { slug: 'account', label: 'Account', icon: 'person', hint: 'Name, data export, sign out' },
  { slug: 'enrolment', label: 'Enrolment', icon: 'school', hint: 'Year, group and specialty' },
  { slug: 'privacy', label: 'Privacy', icon: 'shield_person', hint: 'Leaderboard and helping' },
  {
    slug: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    hint: 'In the app and by email',
  },
  { slug: 'appearance', label: 'Appearance', icon: 'contrast', hint: 'Light, dark or system' },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['slug'];

/** Opened by /settings on desktop, where a section always shows next to the list. */
export const DEFAULT_SECTION: SettingsSection = 'account';

export function parseSection(value: string | undefined): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => section.slug === value)?.slug ?? null;
}

/** The section a path shows: /settings is the default one. */
export function sectionOfPath(pathname: string): SettingsSection {
  return parseSection(pathname.split('/')[2]) ?? DEFAULT_SECTION;
}
