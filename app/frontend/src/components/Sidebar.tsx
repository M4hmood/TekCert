'use client';

import type { CurrentUser } from '@tekcert/types';
import { Icon, IconButton } from '@tekcert/ui';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { isActive, MAIN_NAV, type NavItem, PERSONAL_NAV } from '@/lib/navigation';
import { SIDEBAR_COOKIE, writePreference } from '@/lib/preferences';
import { Avatar } from './Avatar';

export interface SidebarProps {
  /** Initial state from the sidebar cookie, so the server renders the right width. */
  initiallyCollapsed: boolean;
  user: Pick<CurrentUser, 'firstName' | 'lastName' | 'email' | 'classCode' | 'avatarPath'>;
}

export function Sidebar({ initiallyCollapsed, user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writePreference(SIDEBAR_COOKIE, next ? 'collapsed' : 'expanded');
  };

  const renderLink = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-3 h-11 px-3 overflow-hidden rounded-field text-ink2 text-[14.5px] font-medium no-underline hover:bg-sf2 hover:text-ink aria-[current=page]:bg-pri-sf aria-[current=page]:text-pri aria-[current=page]:font-semibold"
        aria-current={active ? 'page' : undefined}
        title={item.label}
      >
        <Icon name={item.icon} filled={active} />
        <span className="whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0">
          {item.label}
        </span>
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
          aria-label="TekCert home"
        >
          <Image
            src="/icons/tekcert.png"
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
            <span className="text-ink3 text-[10.5px] tracking-[0.12em] leading-none uppercase">
              TEK-UP University
            </span>
          </span>
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

      {/* The level joins the class here with points (Sprint 4). */}
      <Link
        href="/profile"
        className="flex flex-none items-center gap-2.75 mt-auto p-2.5 overflow-hidden border border-ln rounded-[10px] text-ink no-underline transition-[padding,border-color] duration-[240ms] ease-standard hover:bg-sf2 group-data-[collapsed=true]/sidebar:p-1 group-data-[collapsed=true]/sidebar:border-transparent max-xl:p-1 max-xl:border-transparent"
        title="My profile"
      >
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarPath={user.avatarPath}
          className="size-9.5 text-[16px]"
        />
        <span className="flex flex-col gap-0.5 min-w-0 whitespace-nowrap transition-opacity duration-[160ms] ease-standard group-data-[collapsed=true]/sidebar:opacity-0 max-xl:opacity-0">
          <span className="text-[14px] font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="overflow-hidden text-ink3 text-[12px] text-ellipsis whitespace-nowrap">
            {user.classCode ?? user.email}
          </span>
        </span>
      </Link>
    </aside>
  );
}
