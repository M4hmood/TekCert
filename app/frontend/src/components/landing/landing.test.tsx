import type { CertificationSummary, PublicStats } from '@tekcert/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { groupByProvider, maxPreparing, semesterLabel, trackLine } from './format';
import { LandingPage } from './LandingPage';

const NOW = '2026-11-14T10:00:00.000Z';

const cert = (
  code: string,
  provider: CertificationSummary['provider'],
  overrides: Partial<CertificationSummary> = {},
): CertificationSummary => ({
  code,
  slug: code.toLowerCase(),
  name: `${code} certification`,
  examCode: null,
  level: 'associate',
  difficulty: 3,
  provider,
  forAllSpecialties: false,
  specialties: ['CIM'],
  chapterCount: 12,
  badgeAsset: null,
  earnedCount: 0,
  ...overrides,
});
const AWS = { code: 'AWS', name: 'Amazon Web Services', hue: 55 };
const CISCO = { code: 'CISCO', name: 'Cisco', hue: 200 };
const NEWCO = { code: 'NEWCO', name: 'A new provider', hue: 10 };

const catalog = [
  cert('SAA-C03', AWS),
  cert('CLF-C02', AWS, { level: 'foundational', name: 'Cloud Practitioner' }),
  cert('SAP-C02', AWS, { level: 'professional' }),
  cert('CCNA', CISCO),
  cert('NEW-1', NEWCO),
];

const stats: PublicStats = {
  certifications: 56,
  providers: 10,
  students: 1386,
  preparing: 412,
  bySpecialty: [
    { code: 'SDIA', name: 'AI & Data Science', hue: 285, preparing: 21 },
    { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225, preparing: 38 },
    { code: 'GLOps', name: 'Software Engineering & DevOps', hue: 165, preparing: 0 },
  ],
  paths: [
    {
      code: 'FOND',
      name: 'Fundamentals',
      hue: null,
      certifications: 7,
      track: ['CLF-C02', 'AZ-900', 'AI-900', 'AIF-C01', 'PCEP'],
      students: 120,
    },
    {
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      hue: 225,
      certifications: 9,
      track: ['CLF-C02', 'SAA-C03', 'SAP-C02', 'DOP-C02'],
      students: 68,
    },
    {
      code: 'SDIA',
      name: 'AI & Data Science',
      hue: 285,
      certifications: 8,
      track: ['AI-900'],
      students: 1,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('landing formatting', () => {
  it('groups the catalog by provider, in display order, lower levels first', () => {
    const groups = groupByProvider(catalog);
    expect(groups.map((group) => group.provider.code)).toEqual(['CISCO', 'AWS', 'NEWCO']);
    expect(groups[1]?.certifications.map((item) => item.code)).toEqual([
      'CLF-C02',
      'SAA-C03',
      'SAP-C02',
    ]);
    expect(groupByProvider([])).toEqual([]);
  });

  it('writes a track as a line', () => {
    expect(trackLine(['CLF-C02', 'SAA-C03', 'SAP-C02', 'DOP-C02'], 3)).toBe(
      'CLF-C02 → SAA-C03 → SAP-C02',
    );
    expect(trackLine(['AI-900'], 3)).toBe('AI-900');
    expect(trackLine(['A', 'B'], 5, ' · ')).toBe('A · B');
  });

  it('names the semester in Tunis time, January belonging to the fall before', () => {
    expect(semesterLabel(new Date('2026-11-14T10:00:00Z'))).toBe('Fall semester 2026');
    expect(semesterLabel(new Date('2027-01-20T10:00:00Z'))).toBe('Fall semester 2026');
    expect(semesterLabel(new Date('2027-02-01T10:00:00Z'))).toBe('Spring semester 2027');
    // 23:30 UTC on 31 August is already 1 September in Tunis.
    expect(semesterLabel(new Date('2027-08-31T23:30:00Z'))).toBe('Fall semester 2027');
  });

  it('finds the longest bar', () => {
    expect(maxPreparing(stats)).toBe(38);
    expect(maxPreparing({ ...stats, bySpecialty: [] })).toBe(0);
  });
});

describe('LandingPage', () => {
  it('invites visitors to sign up or sign in', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Earn the IT certifications that count. Your classmates are already taking them.',
    );
    for (const link of screen.getAllByRole('link', { name: /Create my account|Sign up with/ })) {
      expect(link).toHaveAttribute('href', '/sign-up');
    }
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByText(/No payment, ever/)).toBeInTheDocument();
    // The sections the header links to all exist.
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    for (const link of within(nav).getAllByRole('link')) {
      const id = link.getAttribute('href')?.slice(1) ?? '';
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('shows three totals and the students preparing by specialty', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    const numbers = screen.getByRole('region', { name: 'TekCert in numbers' });
    expect(numbers).toHaveTextContent('Fall semester 2026');
    expect(within(numbers).getByText('412')).toBeInTheDocument();
    expect(within(numbers).getByText('students preparing a certification')).toBeInTheDocument();
    expect(within(numbers).getByText('1,386')).toBeInTheDocument();
    expect(within(numbers).getByText('56')).toBeInTheDocument();
    const rows = within(numbers).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'SDIA21 students preparing in AI & Data Science',
      'CIM38 students preparing in Cloud Infrastructure Management',
      'GLOps0 students preparing in Software Engineering & DevOps',
    ]);
  });

  it('shows the funded certifications by provider', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    expect(screen.getByText('56 certifications · 10 providers')).toBeInTheDocument();
    const rail = screen.getByRole('region', { name: 'Funded certifications by provider' });
    const cards = within(rail).getAllByRole('article');
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Cisco',
      'Amazon Web Services',
      'A new provider',
    ]);
    const aws = cards[1] as HTMLElement;
    expect(aws).toHaveTextContent('3 certifications');
    expect(
      within(aws)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      'CLF-C02Cloud Practitioner',
      'SAA-C03SAA-C03 certification',
      'SAP-C02SAP-C02 certification',
    ]);
    expect(within(cards[0] as HTMLElement).getByText('1 certification')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Full catalog/ })).toHaveAttribute('href', '/catalog');
  });

  it('cuts a long provider list and says how many more there are', () => {
    const many = Array.from({ length: 8 }, (_, i) => cert(`AWS-${i + 1}`, AWS));
    render(<LandingPage stats={stats} catalog={many} now={NOW} />);
    const card = screen.getByRole('article', { name: 'Amazon Web Services' });
    expect(within(card).getAllByRole('listitem')).toHaveLength(7);
    expect(card).toHaveTextContent('and 2 more');
  });

  it('moves the provider rail with its arrows', async () => {
    const user = userEvent.setup();
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    const rail = screen.getByRole('region', { name: 'Funded certifications by provider' });
    const scrollBy = vi.fn();
    rail.scrollBy = scrollBy;
    await user.click(screen.getByRole('button', { name: 'Next providers' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 380, behavior: 'smooth' });
    await user.click(screen.getByRole('button', { name: 'Previous providers' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -380, behavior: 'smooth' });
  });

  it('explains the three steps without promising Release 2 features', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    const how = screen.getByRole('region', { name: /Three steps/ });
    expect(
      within(how)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Tell us your specialty', 'Go chapter by chapter', 'Find who can help']);
    expect(document.body).not.toHaveTextContent(/verified|practice test|upload your proof/i);
  });

  it('lists the paths, Fundamentals first, with how many students follow each', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    const paths = screen.getByRole('region', { name: /One path per specialty/ });
    const cards = within(paths).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Shared path · ING-1 to ING-5');
    expect(cards[0]).toHaveTextContent('7 certifications');
    expect(cards[0]).toHaveTextContent('CLF-C02 · AZ-900 · AI-900 · AIF-C01 · PCEP');
    expect(cards[1]).toHaveTextContent('CIM9 certs');
    expect(cards[1]).toHaveTextContent('CLF-C02 → SAA-C03 → SAP-C02');
    expect(cards[1]).not.toHaveTextContent('DOP-C02');
    expect(cards[1]).toHaveTextContent('68 students follow it');
    expect(cards[2]).toHaveTextContent('1 student follows it');
    expect(within(paths).getByRole('link', { name: /All paths/ })).toHaveAttribute(
      'href',
      '/paths',
    );
  });

  it('still explains TekCert when the API can’t be reached', () => {
    render(<LandingPage stats={null} catalog={null} now={NOW} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'TekCert in numbers' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /One path per specialty/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The catalog can’t be shown right now.');
    expect(screen.getAllByRole('link', { name: /Create my account/ }).length).toBeGreaterThan(0);
  });

  it('names no student anywhere', () => {
    render(<LandingPage stats={stats} catalog={catalog} now={NOW} />);
    // The design's sample names must not come back with real data behind them.
    expect(document.body).not.toHaveTextContent(/Ons|Rania|Mohamed|Yasmine|@tek-up\.de email is/);
    expect(document.body.innerHTML).not.toMatch(/mailto:/);
  });
});
