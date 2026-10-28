export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Sidebar, top group (design/Sidebar.dc.html). */
export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { href: '/catalog', label: 'Catalog', icon: 'menu_book' },
  { href: '/paths', label: 'Paths', icon: 'route' },
  { href: '/community', label: 'Community', icon: 'groups' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
];

/** Sidebar, "My space" group. */
export const PERSONAL_NAV: NavItem[] = [
  { href: '/profile', label: 'My profile', icon: 'person' },
  { href: '/requests', label: 'My requests', icon: 'assignment' },
  { href: '/notifications', label: 'Notifications', icon: 'notifications' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

/** Mobile tab bar (design/BottomNav.dc.html): five tabs, shorter labels. */
export const BOTTOM_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'space_dashboard' },
  { href: '/catalog', label: 'Catalog', icon: 'menu_book' },
  { href: '/paths', label: 'Paths', icon: 'route' },
  { href: '/community', label: 'Community', icon: 'groups' },
  { href: '/profile', label: 'Profile', icon: 'person' },
];

/** A section stays active on its sub-pages, e.g. /catalog/saa-c03 highlights Catalog. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
