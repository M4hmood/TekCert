'use client';

import { cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETTINGS_SECTIONS, sectionOfPath } from './sections';

/**
 * The list of sections. Desktop keeps it on the left of the open section. On phones /settings
 * is this list alone and each section opens on its own page, so it hides there.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const onList = pathname === '/settings';
  const current = sectionOfPath(pathname);
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        'sticky top-8 flex flex-col gap-0.5 max-md:static max-md:gap-0 max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf max-md:overflow-hidden',
        !onList && 'max-md:hidden',
      )}
    >
      {SETTINGS_SECTIONS.map((section) => {
        const active = section.slug === current;
        return (
          <Link
            key={section.slug}
            href={`/settings/${section.slug}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 h-11 px-3 rounded-field text-ink2 text-[14.5px] font-medium no-underline hover:bg-sf2 hover:text-ink',
              'max-md:h-auto max-md:min-h-15 max-md:px-4 max-md:border-b max-md:border-ln max-md:rounded-none max-md:text-ink max-md:last:border-b-0',
              active &&
                'md:bg-pri-sf md:text-pri md:font-semibold md:hover:bg-pri-sf md:hover:text-pri',
            )}
          >
            <Icon name={section.icon} size={20} className="max-md:text-ink3" />
            <span className="flex flex-1 flex-col gap-0.5">
              {section.label}
              <span className="hidden text-ink3 text-[13px] font-normal max-md:block">
                {section.hint}
              </span>
            </span>
            <Icon name="chevron_right" size={20} className="hidden text-ink3 max-md:block" />
          </Link>
        );
      })}
    </nav>
  );
}
