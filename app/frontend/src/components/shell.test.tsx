import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

const USER = {
  firstName: 'Yassine',
  lastName: 'Ben Amor',
  email: 'yassine.benamor@tek-up.de',
  classCode: 'ING-4-CIM-C',
  avatarPath: null,
};

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

function mockPrefersDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: dark && query.includes('dark'), media: query })),
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    pathname.current = '/dashboard';
  });

  it('lists every MVP screen in two groups', () => {
    render(<Sidebar initiallyCollapsed={false} user={USER} />);
    const main = screen.getByRole('navigation', { name: 'Main navigation' });
    const mySpace = screen.getByRole('navigation', { name: 'My space' });
    expect(
      within(main)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'space_dashboardDashboard',
      'menu_bookCatalog',
      'routePaths',
      'groupsCommunity',
      'leaderboardLeaderboard',
    ]);
    expect(within(mySpace).getAllByRole('link')).toHaveLength(4);
  });

  it('marks the current section, including its sub-pages', () => {
    pathname.current = '/catalog/saa-c03';
    render(<Sidebar initiallyCollapsed={false} user={USER} />);
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('collapses and remembers the choice in a cookie', async () => {
    render(<Sidebar initiallyCollapsed={false} user={USER} />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));

    expect(screen.getByRole('complementary')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Expand menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(document.cookie).toContain('sidebar=collapsed');
  });

  it('shows the signed-in student and links to their profile', () => {
    render(<Sidebar initiallyCollapsed={false} user={USER} />);
    const account = screen.getByRole('link', { name: /Yassine Ben Amor/ });
    expect(account).toHaveAttribute('href', '/profile');
    expect(account).toHaveTextContent('YB');
    expect(account).toHaveTextContent('ING-4-CIM-C');
  });

  it('shows the profile photo through the API proxy when there is one', () => {
    render(
      <Sidebar
        initiallyCollapsed={false}
        user={{ ...USER, avatarPath: '/users/u1/avatar?v=abc' }}
      />,
    );
    const account = screen.getByRole('link', { name: /Yassine Ben Amor/ });
    expect(account.querySelector('img')).toHaveAttribute('src', '/api/users/u1/avatar?v=abc');
    expect(account).not.toHaveTextContent('YB');
  });

  it('keeps accessible link names when collapsed', () => {
    render(<Sidebar initiallyCollapsed user={USER} />);
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toBeInTheDocument();
  });
});

describe('BottomNav', () => {
  it('shows the five mobile tabs with the active one marked', () => {
    pathname.current = '/profile';
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/dashboard',
      '/catalog',
      '/paths',
      '/community',
      '/profile',
    ]);
    expect(screen.getByRole('link', { name: /Profile/ })).toHaveAttribute('aria-current', 'page');
  });
});

describe('ThemeToggle', () => {
  it('switches from the OS light theme to dark and stores it', async () => {
    mockPrefersDark(false);
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
  });

  it('switches back to light from an OS dark theme', async () => {
    mockPrefersDark(true);
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
