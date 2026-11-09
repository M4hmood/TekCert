'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const TABS = [
  { href: '/sign-in', label: 'Sign in' },
  { href: '/sign-up', label: 'Sign up' },
] as const;

/**
 * "Sign in | Sign up" switch. Each tab is its own URL, so either can be linked to directly.
 * It lives in the auth layout, which stays mounted between the two pages, so the white pill
 * slides from one tab to the other.
 */
export function AuthTabs() {
  const pathname = usePathname();
  const next = useSearchParams().get('next');
  const active = TABS.findIndex((tab) => tab.href === pathname);
  if (active === -1) return null;

  const query = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <nav
      aria-label="Account"
      className="group/tabs relative grid grid-cols-2 p-1 rounded-[10px] bg-sf2"
      data-active={active}
      // Own layer during page transitions, so the live tab bar (and its sliding pill) shows through
      // instead of being cross-faded.
      style={{ viewTransitionName: 'auth-tabs' }}
    >
      <span
        className="absolute inset-y-1 start-1 w-[calc(50%-4px)] rounded-[7px] bg-sf shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform duration-[260ms] ease-standard group-data-[active='1']/tabs:translate-x-full"
        aria-hidden
      />
      {TABS.map((tab, i) => (
        <Link
          key={tab.href}
          href={`${tab.href}${query}`}
          className="relative grid place-items-center h-11 rounded-[7px] text-ink2 text-[15px] font-semibold no-underline transition-[color] duration-200 ease-[ease] aria-[current=page]:text-ink"
          aria-current={i === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
