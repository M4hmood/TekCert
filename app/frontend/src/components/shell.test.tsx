import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    // The avatar waits for the photo to load, which never happens in jsdom.
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        complete = true;
        naturalWidth = 100;
        addEventListener() {}
        removeEventListener() {}
      },
    );
    render(
      <Sidebar
        initiallyCollapsed={false}
        user={{ ...USER, avatarPath: '/users/u1/avatar?v=abc' }}
      />,
    );
    const account = screen.getByRole('link', { name: /Yassine Ben Amor/ });
    expect(account.querySelector('img')).toHaveAttribute('src', '/api/users/u1/avatar?v=abc');
    expect(account).not.toHaveTextContent('YB');
    vi.unstubAllGlobals();
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

  describe('with view transitions', () => {
    const root = document.documentElement;

    function stubViewTransition() {
      let finish = () => {};
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const start = vi.fn((update: () => void) => {
        update();
        return { finished };
      });
      Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
      return { start, finish: () => finish() };
    }

    afterEach(() => {
      Reflect.deleteProperty(document, 'startViewTransition');
      delete root.dataset.themeSwitching;
    });

    it('animates from the centre of the button, then cleans up', async () => {
      mockPrefersDark(false);
      const { start, finish } = stubViewTransition();
      render(<ThemeToggle />);
      const button = screen.getByRole('button', { name: 'Change theme' });
      button.getBoundingClientRect = () => new DOMRect(100, 20, 44, 44);
      await userEvent.click(button);

      expect(start).toHaveBeenCalledOnce();
      expect(root.dataset.theme).toBe('dark');
      expect(root.dataset.themeSwitching).toBe('to-dark');
      expect(root.style.getPropertyValue('--theme-x')).toBe('122px');
      expect(root.style.getPropertyValue('--theme-y')).toBe('42px');
      expect(Number.parseFloat(root.style.getPropertyValue('--theme-radius'))).toBeGreaterThan(0);

      await act(async () => finish());
      expect(root.dataset.themeSwitching).toBeUndefined();
      expect(root.style.getPropertyValue('--theme-x')).toBe('');
    });

    it('switches at once for people who prefer reduced motion', async () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })),
      );
      const { start } = stubViewTransition();
      render(<ThemeToggle />);
      await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));

      expect(start).not.toHaveBeenCalled();
      expect(root.dataset.theme).toBe('dark');
      expect(root.dataset.themeSwitching).toBeUndefined();
    });
  });
});
