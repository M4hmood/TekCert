import type { CertificationSummary } from '@tekcert/types';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogView } from './CatalogView';
import { pageItems } from './Pagination';
import { CertBadge } from './parts';

function cert(overrides: Partial<CertificationSummary> & { code: string }): CertificationSummary {
  return {
    slug: overrides.code.toLowerCase(),
    name: overrides.code,
    examCode: null,
    level: 'associate',
    difficulty: 3,
    provider: { code: 'AWS', name: 'Amazon Web Services', hue: 55 },
    forAllSpecialties: false,
    specialties: ['CIM'],
    chapterCount: 8,
    badgeAsset: null,
    earnedCount: 0,
    ...overrides,
  };
}

const aws = { code: 'AWS', name: 'Amazon Web Services', hue: 55 };
const azure = { code: 'AZURE', name: 'Microsoft Azure', hue: 245 };
const CERTS = [
  cert({
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    level: 'foundational',
    difficulty: 1,
    forAllSpecialties: true,
    specialties: [],
    earnedCount: 41,
    badgeAsset: 'aws-clf-c02.webp',
  }),
  cert({ code: 'SAA-C03', name: 'AWS Solutions Architect', earnedCount: 14 }),
  cert({ code: 'AZ-104', name: 'Microsoft Azure Administrator', provider: azure, earnedCount: 9 }),
  cert({
    code: 'AZ-400',
    name: 'Microsoft DevOps Engineer Expert',
    provider: azure,
    level: 'expert',
    difficulty: 4,
    specialties: ['GLOps'],
    earnedCount: 1,
  }),
];

const count = () => screen.getByText(/certifications?$/, { selector: 'span' }).textContent;
const cardNames = () =>
  screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
    .filter((href) => href?.startsWith('/catalog/'));

beforeAll(() => {
  // jsdom has no layout, so no scrolling.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  window.history.replaceState(null, '', '/catalog');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CatalogView', () => {
  it('lists every certification, most earned first, with my status', () => {
    render(
      <CatalogView
        certifications={CERTS}
        initialQuery={{}}
        initialPage={1}
        mine={{ 'saa-c03': 'in_progress' }}
      />,
    );
    expect(count()).toBe('4 certifications');
    expect(cardNames()).toEqual([
      '/catalog/clf-c02',
      '/catalog/saa-c03',
      '/catalog/az-104',
      '/catalog/az-400',
    ]);
    const saa = screen.getByRole('link', { name: /AWS Solutions Architect/ });
    // Once for desktop, once for phones; CSS shows one.
    expect(within(saa).getAllByText('In progress')).toHaveLength(2);
    expect(saa).toHaveTextContent('14 students earned it');
  });

  it('starts from the filters in the URL', () => {
    render(
      <CatalogView
        certifications={CERTS}
        initialQuery={{ provider: ['AZURE'], level: ['expert'] }}
        initialPage={1}
        mine={{}}
      />,
    );
    expect(count()).toBe('1 certification');
    expect(screen.getByRole('checkbox', { name: /Microsoft Azure/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Remove Expert' })).toBeInTheDocument();
  });

  it('filters, writes the URL and removes a filter from its chip', async () => {
    const user = userEvent.setup();
    render(<CatalogView certifications={CERTS} initialQuery={{}} initialPage={1} mine={{}} />);

    await user.click(screen.getByRole('checkbox', { name: /Microsoft Azure/ }));
    await user.click(
      within(screen.getByRole('region', { name: 'Filters' })).getByRole('button', {
        name: 'Associate',
      }),
    );
    expect(count()).toBe('1 certification');
    expect(window.location.search).toBe('?provider=AZURE&level=associate');

    await user.click(screen.getByRole('button', { name: 'Remove Associate' }));
    expect(count()).toBe('2 certifications');
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(count()).toBe('4 certifications');
    expect(window.location.search).toBe('');
  });

  it('counts each provider with the other filters applied', async () => {
    const user = userEvent.setup();
    render(<CatalogView certifications={CERTS} initialQuery={{}} initialPage={1} mine={{}} />);
    await user.click(screen.getByRole('button', { name: 'Difficulty up to 1' }));
    expect(
      screen.getByRole('checkbox', { name: /Amazon Web Services/ }).closest('label'),
    ).toHaveTextContent('1');
    expect(
      screen.getByRole('checkbox', { name: /Microsoft Azure/ }).closest('label'),
    ).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Remove Difficulty ≤ 1' })).toBeInTheDocument();
  });

  it('searches after a short pause and offers to clear a search with no result', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CatalogView certifications={CERTS} initialQuery={{}} initialPage={1} mine={{}} />);

    await user.type(screen.getByRole('searchbox'), 'az-1');
    act(() => vi.advanceTimersByTime(300));
    expect(count()).toBe('1 certification');
    expect(window.location.search).toBe('?q=az-1');

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'kubernetes');
    act(() => vi.advanceTimersByTime(300));
    expect(
      screen.getByRole('heading', { name: 'No results for “kubernetes”' }),
    ).toBeInTheDocument();
    // The empty state's button (the search field has its own).
    const [, clearButton] = screen.getAllByRole('button', { name: 'Clear search' });
    if (!clearButton) throw new Error('no empty-state button');
    await user.click(clearButton);
    expect(count()).toBe('4 certifications');
  });

  it('explains an empty filter result and clears the filters', async () => {
    const user = userEvent.setup();
    render(
      <CatalogView
        certifications={CERTS}
        initialQuery={{ provider: ['AZURE'], maxDifficulty: 1 }}
        initialPage={1}
        mine={{}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No certification matches' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(count()).toBe('4 certifications');
  });

  it('applies the mobile filter sheet only on "Show N"', async () => {
    const user = userEvent.setup();
    render(<CatalogView certifications={CERTS} initialQuery={{}} initialPage={1} mine={{}} />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    await user.click(within(sheet).getByRole('button', { name: 'Expert' }));
    expect(count()).toBe('4 certifications');
    await user.click(within(sheet).getByRole('button', { name: 'Show 1 certification' }));
    expect(count()).toBe('1 certification');
    expect(screen.getByRole('button', { name: 'Filters · 1' })).toBeInTheDocument();
  });

  it('sorts from the menu', async () => {
    const user = userEvent.setup();
    render(<CatalogView certifications={CERTS} initialQuery={{}} initialPage={1} mine={{}} />);
    await user.click(screen.getByRole('combobox', { name: 'Sort:' }));
    await user.click(screen.getByRole('option', { name: 'Name A–Z' }));
    expect(cardNames()[0]).toBe('/catalog/clf-c02');
    expect(cardNames()[1]).toBe('/catalog/saa-c03');
    expect(window.location.search).toBe('?sort=name');
  });
});

describe('pagination', () => {
  // Named so "most earned" (all 0) falls back to this alphabetical order.
  const MANY = Array.from({ length: 30 }, (_, i) => {
    const code = `C-${String(i + 1).padStart(2, '0')}`;
    return cert({ code, name: code });
  });
  const shownSlugs = () => cardNames().map((href) => href?.replace('/catalog/', ''));
  const view = (initialPage = 1, initialQuery = {}) =>
    render(
      <CatalogView
        certifications={MANY}
        initialQuery={initialQuery}
        initialPage={initialPage}
        mine={{}}
      />,
    );

  it('shows 12 certifications at a time and counts them all', () => {
    view();
    expect(cardNames()).toHaveLength(12);
    expect(count()).toBe('30 certifications');
    expect(screen.getByText('1–12 of 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('moves between pages, writes the URL and moves focus to the results', async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(shownSlugs()).toEqual(MANY.slice(24).map((c) => c.slug));
    expect(screen.getByText('25–30 of 30')).toBeInTheDocument();
    expect(window.location.search).toBe('?page=3');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(document.activeElement?.tagName).toBe('UL');

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('13–24 of 30')).toBeInTheDocument();
    expect(window.location.search).toBe('?page=2');
  });

  it('opens on the page in the URL, or the last one when it is past the end', () => {
    const { unmount } = view(2);
    expect(shownSlugs()[0]).toBe('c-13');
    unmount();
    view(99);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });

  it('goes back to page 1 when a filter or the sort changes', async () => {
    const user = userEvent.setup();
    view(3);
    await user.click(screen.getByRole('combobox', { name: 'Sort:' }));
    await user.click(screen.getByRole('option', { name: 'Name A–Z' }));
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(window.location.search).toBe('?sort=name');
  });

  it('is hidden when everything fits on one page', () => {
    view(1, { q: 'C-01' });
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });
});

describe('pageItems', () => {
  it('shows every page when there are few', () => {
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
  });

  it('keeps the ends and the neighbours of the current page', () => {
    expect(pageItems(5, 9)).toEqual([1, 'gap', 4, 5, 6, 'gap', 9]);
    expect(pageItems(1, 9)).toEqual([1, 2, 'gap', 9]);
  });
});

describe('CertBadge', () => {
  it('shows the badge file, or the code on the provider colour when there is none', () => {
    const { container, rerender } = render(
      <CertBadge code="CLF-C02" badgeAsset="aws-clf-c02.webp" provider={aws} size={48} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toContain('aws-clf-c02.webp');
    rerender(<CertBadge code="RHCSA" badgeAsset={null} provider={aws} size={48} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('RHCSA');
  });
});
