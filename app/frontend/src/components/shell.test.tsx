import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lightSources } from '@/lib/deluminator';
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
        return { ready: new Promise(() => undefined), finished };
      });
      Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
      return { start, finish: () => finish() };
    }

    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    });

    afterEach(() => {
      Reflect.deleteProperty(document, 'startViewTransition');
      delete root.dataset.themeSwitching;
    });

    it('plays the effect with a canvas for the orbs, then cleans up', async () => {
      mockPrefersDark(false);
      const { start, finish } = stubViewTransition();
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
      render(<ThemeToggle />);
      await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));

      expect((play.mock.contexts[0] as HTMLAudioElement).src).toContain('light-in');

      expect(start).toHaveBeenCalledOnce();
      expect(root.dataset.theme).toBe('dark');
      expect(root.dataset.themeSwitching).toBe('to-dark');
      expect(document.querySelector('[data-deluminator]')).not.toBeNull();

      await act(async () => finish());
      expect(root.dataset.themeSwitching).toBeUndefined();
      expect(document.querySelector('[data-deluminator]')).toBeNull();
    });

    it('ignores a second press while the effect plays', async () => {
      mockPrefersDark(false);
      const { start } = stubViewTransition();
      render(<ThemeToggle />);
      const button = screen.getByRole('button', { name: 'Change theme' });
      await userEvent.click(button);
      await userEvent.click(button);
      expect(start).toHaveBeenCalledOnce();
      expect(root.dataset.theme).toBe('dark');
      document.querySelector('[data-deluminator]')?.remove();
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

describe('lightSources', () => {
  it('covers the screen, starting with the lights nearest the button', () => {
    const button = { x: 1400, y: 40 };
    const sources = lightSources(1440, 900, button);
    expect(sources).toHaveLength(6);
    for (const source of sources) {
      expect(source.x).toBeGreaterThan(0);
      expect(source.x).toBeLessThan(1440);
      expect(source.y).toBeGreaterThan(0);
      expect(source.y).toBeLessThan(900);
    }
    const distances = sources.map((s) => Math.hypot(s.x - button.x, s.y - button.y));
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('has six lights on a phone too', () => {
    expect(lightSources(390, 844, { x: 350, y: 40 })).toHaveLength(6);
  });
});
