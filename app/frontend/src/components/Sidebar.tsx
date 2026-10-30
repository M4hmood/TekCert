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
import styles from './Sidebar.module.css';

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
        className={styles.link}
        aria-current={active ? 'page' : undefined}
        title={item.label}
      >
        <Icon name={item.icon} filled={active} />
        <span className={styles.label}>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className={styles.sidebar} data-collapsed={collapsed}>
      <div className={styles.top}>
        <Link href="/dashboard" className={styles.brand} aria-label="TekCert home">
          <Image
            src="/icons/tekcert.png"
            alt=""
            width={36}
            height={36}
            className={styles.logo}
            priority
          />
          <span className={styles.wordmark}>
            <span className={styles.name}>TekCert</span>
            <span className={styles.school}>TEK-UP</span>
          </span>
        </Link>
        <IconButton
          icon={collapsed ? 'left_panel_open' : 'left_panel_close'}
          label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed}
          onClick={toggle}
          className={styles.collapseToggle}
        />
      </div>

      <nav aria-label="Main navigation" className={styles.group}>
        {MAIN_NAV.map(renderLink)}
      </nav>

      <nav aria-labelledby="sidebar-my-space" className={styles.group}>
        <span id="sidebar-my-space" className={styles.groupLabel}>
          My space
        </span>
        {PERSONAL_NAV.map(renderLink)}
      </nav>

      {/* The level joins the class here with points (Sprint 4). */}
      <Link href="/profile" className={styles.account} title="My profile">
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarPath={user.avatarPath}
          className={styles.avatar}
        />
        <span className={styles.accountText}>
          <span className={styles.accountName}>
            {user.firstName} {user.lastName}
          </span>
          <span className={styles.accountMeta}>{user.classCode ?? user.email}</span>
        </span>
      </Link>
    </aside>
  );
}
