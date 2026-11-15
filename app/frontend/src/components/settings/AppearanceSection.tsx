'use client';

import { RadioGroup, RadioGroupItem, Toast } from '@tekcert/ui';
import { type CSSProperties, useRef, useSyncExternalStore } from 'react';
import { THEME_COOKIE, type ThemePreference, writePreference } from '@/lib/preferences';
import { saveThemeToAccount } from '@/lib/shell-context';
import { applyTheme, currentPreference } from '@/lib/theme';
import { useToast } from '@/lib/use-toast';
import { SectionCard } from './parts';

/** Each preview is drawn in the colours of its own theme, whatever theme the page is in. */
const THEMES: {
  value: ThemePreference;
  label: string;
  page: string;
  ink: string;
  accent: string;
  saved: string;
}[] = [
  {
    value: 'light',
    label: 'Light',
    page: '#F6F3EC',
    ink: '#131A2C',
    accent: '#1C2F5E',
    saved: 'Light theme on',
  },
  {
    value: 'dark',
    label: 'Dark',
    page: '#0D1220',
    ink: '#ECEAE4',
    accent: '#AFC2F4',
    saved: 'Dark theme on',
  },
  {
    value: 'system',
    label: 'System',
    page: 'linear-gradient(90deg, #F6F3EC 50%, #0D1220 50%)',
    ink: '#7A7F90',
    accent: '#5E77B5',
    saved: 'Theme matches your device',
  },
];

/** The theme button in the page header changes <html> too: this section follows it. */
function watchTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** Light, dark, or whatever the device uses. Applied at once and saved on the account. */
export function AppearanceSection({ initial }: { initial: ThemePreference }) {
  const { toast, show } = useToast();
  const group = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(watchTheme, currentPreference, () => initial);

  const choose = (next: ThemePreference) => {
    const card = group.current?.querySelector<HTMLElement>(`[value="${next}"]`);
    applyTheme(next, card ?? undefined);
    writePreference(THEME_COOKIE, next);
    saveThemeToAccount(next);
    show(THEMES.find((option) => option.value === next)?.saved ?? 'Theme saved');
  };

  return (
    <SectionCard title="Appearance" description="Changes apply immediately.">
      <RadioGroup
        ref={group}
        aria-label="Theme"
        value={theme}
        onValueChange={(value) => choose(value as ThemePreference)}
        className="grid grid-cols-3 gap-3 max-md:grid-cols-1"
      >
        {THEMES.map((option) => (
          <RadioGroupItem
            key={option.value}
            value={option.value}
            className="flex flex-col gap-2.5 p-2.5 border-[1.5px] border-ln2 rounded-[14px] bg-sf text-ink data-[state=checked]:p-2.25 data-[state=checked]:border-2 data-[state=checked]:border-pri max-md:flex-row max-md:items-center"
          >
            <span
              aria-hidden
              style={{ '--page': option.page, '--ink': option.ink } as CSSProperties}
              className="flex flex-col gap-1.5 w-full h-24 p-3 border border-ln rounded-[9px] [background:var(--page)] max-md:w-28 max-md:h-16 max-md:p-2"
            >
              <span className="w-3/5 h-2 rounded-[4px] bg-(--ink)" />
              <span className="w-2/5 h-2 rounded-[4px] bg-(--ink) opacity-50" />
              <span
                className="w-9 h-3.5 mt-auto rounded-[4px]"
                style={{ background: option.accent }}
              />
            </span>
            <span className="px-1 pb-1 text-[14.5px] font-semibold max-md:p-0">{option.label}</span>
          </RadioGroupItem>
        ))}
      </RadioGroup>
      <p className="text-ink3 text-[13px] leading-[1.5]">
        Your choice is saved on your account, so your other devices open in the same theme.
      </p>
      {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} />}
    </SectionCard>
  );
}
