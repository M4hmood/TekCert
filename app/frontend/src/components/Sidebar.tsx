'use client';

import type { CurrentUser } from '@tekcert/types';
import { Icon, IconButton } from '@tekcert/ui';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { isActive, MAIN_NAV, type NavItem, PERSONAL_NAV } from '@/lib/navigation';
import { SIDEBAR_COOKIE, writePreference } from '@/lib/preferences';
import { useShell } from '@/lib/shell-context';
import { Avatar } from './Avatar';
import { SchoolLogo } from './SchoolLogo';

export interface SidebarProps {
  /** Initial state from the sidebar cookie, so the server renders the right width. */
  initiallyCollapsed: boolean;
  user: Pick<CurrentUser, 'firstName' | 'lastName' | 'email' | 'classCode' | 'avatarPath'>;
}

/** "ING-4-CIM-C" → "ING-4 · CIM · Group C"; "ING-2-B" → "ING-2 · Group B". */
export function classLabel(code: string): string {
  const [school, year, ...rest] = code.split('-');
  const group = rest.pop();
  if (!school || !year || !group) return code;
  return [`${school}-${year}`, ...rest, `Group ${group}`].join(' · ');
}

export function Sidebar({ initiallyCollapsed, user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const { unread } = useShell();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writePreference(SIDEBAR_COOKIE, next ? 'collapsed' : 'expanded');
  };

  const renderLink = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const badge = item.href === '/notifications' && unread > 0 ? unread : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="relative flex items-center gap-3 h-11 px-3 overflow-hidden rounded-field text-ink2 text-[14.5px] font-medium no-underline hover:bg-sf2 hover:text-ink aria-[current=page]:bg-pri-sf aria-[current=page]:text-pri aria-[current=page]:font-semibold"
        aria-current={active ? 'page' : undefined}
        title={item.label}
      >
        <Icon name={item.icon} filled={active} />
        <span className="flex-1 whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0">
          {item.label}
        </span>
        {badge > 0 && (
          <>
            <span
              aria-hidden
              className="grid flex-none place-items-center min-w-5.5 h-5.5 px-1.5 rounded-[11px] bg-pri text-pri-ink text-[12px] font-semibold transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0"
            >
              {badge > 99 ? '99+' : badge}
            </span>
            {/* The collapsed rail has no room for the number: a dot on the icon instead. */}
            <span
              aria-hidden
              className="absolute top-2.5 start-7.5 size-2 rounded-full bg-err opacity-0 transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-100 max-xl:opacity-100"
            />
            <span className="sr-only">, {badge} unread</span>
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className="group/sidebar sticky top-0 flex flex-none flex-col gap-7 w-(--sidebar-width) h-dvh pt-5 px-3.5 pb-4 overflow-x-hidden overflow-y-auto border-e border-ln bg-sf font-sans transition-[width] duration-[240ms] ease-standard data-[collapsed=true]:w-(--sidebar-width-collapsed) max-xl:w-(--sidebar-width-collapsed) max-md:hidden"
      data-collapsed={collapsed}
    >
      <div className="relative flex-none h-11 transition-[height] duration-[240ms] ease-standard group-data-[collapsed=true]/sidebar:h-25.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.75 h-11 ps-1.75 text-ink no-underline"
        >
          <Image
            src="/icons/tekcert-96.png"
            alt=""
            width={36}
            height={36}
            className="flex-none size-9 object-contain"
            priority
          />
          <span className="flex flex-col gap-0.75 whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0">
            <span className="font-serif text-[22px] font-semibold tracking-[-0.01em] leading-none">
              TekCert
            </span>
            <SchoolLogo className="self-start h-6.5 -ms-0.5" />
          </span>
          {/* The name is the visible text plus this, so speech input can say what it sees. */}
          <span className="sr-only"> home</span>
        </Link>
        <IconButton
          icon={collapsed ? 'left_panel_open' : 'left_panel_close'}
          label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
          onClick={toggle}
          className="absolute top-0 end-0 transition-[top,inset-inline-end] duration-[240ms] ease-standard group-data-[collapsed=true]/sidebar:top-14.5 group-data-[collapsed=true]/sidebar:end-0.5 max-xl:hidden"
        />
      </div>

      <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
        {MAIN_NAV.map(renderLink)}
      </nav>

      <nav aria-labelledby="sidebar-my-space" className="flex flex-col gap-0.5">
        <span
          id="sidebar-my-space"
          className="px-3 pb-2 text-ink3 text-[11px] font-semibold tracking-[0.1em] uppercase whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0"
        >
          My space
        </span>
        {PERSONAL_NAV.map(renderLink)}
      </nav>

      {/* The student, their class, and the way to their profile. */}
      <Link
        href="/profile"
        className="group/me flex flex-none items-center gap-3 mt-auto p-2.5 overflow-hidden border border-ln rounded-[12px] bg-bg text-ink no-underline transition-[padding,border-color,background-color] duration-[240ms] ease-standard hover:border-ln2 hover:bg-sf2 group-data-[collapsed=true]/sidebar:p-1 group-data-[collapsed=true]/sidebar:border-transparent group-data-[collapsed=true]/sidebar:bg-transparent max-xl:p-1 max-xl:border-transparent max-xl:bg-transparent"
        title="My profile"
      >
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarPath={user.avatarPath}
          className="size-9.5 font-sans text-[13.5px] font-semibold tracking-[0.02em]"
        />
        <span className="flex flex-1 flex-col gap-0.5 min-w-0 whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0">
          <span className="overflow-hidden text-[14px] font-semibold leading-[1.25] text-ellipsis">
            {user.firstName} {user.lastName}
          </span>
          <span className="overflow-hidden text-ink3 text-[12.5px] leading-[1.25] text-ellipsis">
            {user.classCode ? classLabel(user.classCode) : user.email}
          </span>
        </span>
        <Icon
          name="chevron_right"
          size={18}
          className="flex-none text-ink3 transition-[opacity,translate] duration-200 group-hover/me:translate-x-0.5 group-hover/me:text-ink group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0"
        />
      </Link>
    </aside>
  );
}
