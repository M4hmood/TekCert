import {
  BADGE_KEYS,
  type Directory,
  type DirectoryPerson,
  type StudentProfile,
} from '@tekcert/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryView, type DirectoryViewProps } from './DirectoryView';
import {
  classLabel,
  countNoun,
  directorySearch,
  parseDirectoryFilters,
  scopeLabels,
} from './format';
import { ProfileView } from './ProfileView';

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const NOW = '2026-11-11T09:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const aws = { code: 'AWS', name: 'Amazon Web Services', hue: 55 };
const viewer = { classCode: 'ING-4-CIM-A', year: 4 as const, specialty: 'CIM' as const };

const person = (n: number, overrides: Partial<DirectoryPerson> = {}): DirectoryPerson => ({
  id: uuid(n),
  firstName: 'Rania',
  lastName: 'Gharbi',
  avatarPath: null,
  classCode: 'ING-4-CIM-A',
  year: 4,
  specialty: 'CIM',
  availableToHelp: false,
  isMe: false,
  held: [],
  preparing: [],
  earnedCount: 0,
  preparingCount: 0,
  level: { rank: 1, roman: 'I', name: 'Novice' },
  points: 0,
  ...overrides,
});

const directory = (overrides: Partial<Directory> = {}): Directory => ({
  total: 2,
  page: 1,
  pageSize: 24,
  items: [
    person(1, { firstName: 'Yassine', lastName: 'Ben Amor', isMe: true, points: 340 }),
    person(2, {
      availableToHelp: true,
      held: [
        { code: 'SAA-C03', slug: 'saa-c03' },
        { code: 'AZ-104', slug: 'az-104' },
        { code: 'CLF-C02', slug: 'clf-c02' },
      ],
      preparing: [{ code: 'SAP-C02', slug: 'sap-c02' }],
      earnedCount: 3,
      preparingCount: 1,
      points: 960,
    }),
  ],
  specialties: [{ code: 'CIM', count: 2 }],
  viewer,
  ...overrides,
});

function view(overrides: Partial<DirectoryViewProps> = {}) {
  return render(
    <DirectoryView
      initialFilters={{ scope: 'specialty' }}
      initial={directory()}
      holdable={[
        { slug: 'az-104', code: 'AZ-104' },
        { slug: 'saa-c03', code: 'SAA-C03' },
      ]}
      {...overrides}
    />,
  );
}

/** Answers every /api call with `body` and records the paths asked for. */
function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const lastPath = (mock: ReturnType<typeof mockApi>) => String(mock.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  window.history.replaceState(null, '', '/community');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('directory formatting', () => {
  it('reads the filters from the URL and drops what is invalid', () => {
    expect(parseDirectoryFilters({})).toEqual({ scope: 'specialty' });
    expect(
      parseDirectoryFilters({
        scope: 'institute',
        q: ['rania', 'ignored'],
        holds: 'saa-c03',
        help: 'true',
        specialty: 'SSIR',
        page: '4',
      }),
    ).toEqual({ scope: 'institute', q: 'rania', holds: 'saa-c03', help: true, specialty: 'SSIR' });
    // One bad value doesn't cost the others.
    expect(parseDirectoryFilters({ scope: 'world', q: 'a', holds: 'saa-c03' })).toEqual({
      scope: 'specialty',
      holds: 'saa-c03',
    });
    expect(parseDirectoryFilters({ help: 'false' })).toEqual({ scope: 'specialty' });
  });

  it('writes them back, leaving the defaults out', () => {
    expect(directorySearch({ scope: 'specialty' })).toBe('');
    expect(directorySearch({ scope: 'class', q: 'ben amor', holds: 'az-104', help: true }, 2)).toBe(
      'scope=class&q=ben+amor&holds=az-104&help=true&page=2',
    );
  });

  it('names classes, scopes and the count', () => {
    expect(classLabel({ classCode: 'ING-4-CIM-A', year: 4, specialty: 'CIM' })).toBe(
      'ING-4 CIM · group A',
    );
    expect(classLabel({ classCode: 'ING-2-B', year: 2, specialty: null })).toBe('ING-2 · group B');
    expect(scopeLabels(viewer).map((s) => s.long)).toEqual([
      'My class · ING-4 A',
      'My specialty · CIM',
      'My level · ING-4',
      'Whole institute',
    ]);
    expect(countNoun(68, { scope: 'specialty' }, viewer)).toBe('CIM students');
    expect(countNoun(1, { scope: 'institute' }, viewer)).toBe('student');
    expect(countNoun(5, { scope: 'institute', specialty: 'SSIR' }, viewer)).toBe('SSIR students');
  });
});

describe('DirectoryView', () => {
  it('shows each student as a link to their profile, me first', () => {
    view();
    const students = within(screen.getByRole('list', { name: 'Students' }));
    const links = students.getAllByRole('link');
    expect(links[0]).toHaveAccessibleName('Yassine Ben Amor (you), ING-4 CIM · group A');
    expect(links[0]).toHaveAttribute('href', '/profile');
    expect(links[1]).toHaveAccessibleName('Rania Gharbi, ING-4 CIM · group A');
    expect(links[1]).toHaveAttribute('href', `/community/${uuid(2)}`);
    expect(links[1]).toHaveTextContent('3 earned · 1 in progress');
    expect(links[1]).toHaveTextContent('960 pts');
    expect(within(links[1] as HTMLElement).getAllByLabelText('Available to help')).not.toHaveLength(
      0,
    );
    expect(screen.getByText('CIM students')).toBeInTheDocument();
  });

  it('shows the level instead of the points for a student who hides them', () => {
    view({
      initial: directory({
        total: 1,
        items: [person(3, { points: null, level: { rank: 2, roman: 'II', name: 'Bachelor' } })],
      }),
    });
    const card = screen.getByRole('link', { name: /Rania Gharbi/ });
    expect(card).toHaveTextContent('Bachelor');
    expect(card).not.toHaveTextContent('pts');
  });

  it('switches scope: asks the API, updates the URL and drops the specialty chip', async () => {
    const user = userEvent.setup();
    const api = mockApi(directory({ total: 1, items: [person(4)] }));
    view({ initialFilters: { scope: 'institute', specialty: 'CIM' } });

    const scope = screen.getAllByRole('group', { name: 'Scope' })[0] as HTMLElement;
    await user.click(within(scope).getByRole('button', { name: /My class/ }));
    await waitFor(() => expect(lastPath(api)).toBe('/api/community/students?scope=class'));
    expect(window.location.search).toBe('?scope=class');
    expect(within(scope).getByRole('button', { name: /My class/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('searches once typing pauses, and only from two characters', async () => {
    const user = userEvent.setup();
    const api = mockApi(directory({ total: 0, items: [] }));
    view();
    const box = screen.getByRole('searchbox', { name: 'Search for a student' });

    await user.type(box, 'r');
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(api).not.toHaveBeenCalled();

    await user.type(box, 'ania');
    await waitFor(() => expect(lastPath(api)).toBe('/api/community/students?q=rania'));
    expect(api).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Nobody matches' })).toBeInTheDocument();
    expect(screen.getByText(/Widen the scope to the whole institute/)).toBeInTheDocument();
  });

  it('filters on "available to help" and clears every filter at once', async () => {
    const user = userEvent.setup();
    const api = mockApi(directory());
    view();

    const help = screen.getByRole('button', { name: 'Available to help' });
    await user.click(help);
    await waitFor(() => expect(lastPath(api)).toBe('/api/community/students?help=true'));
    expect(help).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Filters · 1 active' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(lastPath(api)).toBe('/api/community/students'));
    expect(help).toHaveAttribute('aria-pressed', 'false');
    expect(window.location.search).toBe('');
  });

  it('shows the specialty chips on the wide scopes, with their counts', async () => {
    const user = userEvent.setup();
    const api = mockApi(directory());
    view({
      initialFilters: { scope: 'institute' },
      initial: directory({
        specialties: [
          { code: 'CIM', count: 4 },
          { code: 'none', count: 1 },
        ],
      }),
    });
    const chips = within(screen.getByRole('group', { name: 'Specialty' }));
    expect(chips.getByRole('button', { name: /^CIM\s*4$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(chips.getByRole('button', { name: /^No specialty yet\s*1$/ }));
    await waitFor(() =>
      expect(lastPath(api)).toBe('/api/community/students?scope=institute&specialty=none'),
    );
  });

  it('adds the next page under "Show more"', async () => {
    const user = userEvent.setup();
    const api = mockApi(
      directory({ total: 3, page: 2, items: [person(9, { firstName: 'Omar' })] }),
    );
    view({ initial: directory({ total: 3 }) });

    expect(screen.getByText('Showing 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    await waitFor(() => expect(lastPath(api)).toBe('/api/community/students?page=2'));
    expect(await screen.findByRole('link', { name: /Omar Gharbi/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('offers to try again when the directory could not be loaded', async () => {
    const user = userEvent.setup();
    const api = mockApi(directory());
    view({ initial: null });
    expect(screen.getByRole('alert')).toHaveTextContent('The directory could not be loaded.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('list', { name: 'Students' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

const profile = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  id: uuid(2),
  firstName: 'Ons',
  lastName: 'Ben Salah',
  avatarPath: null,
  classCode: 'ING-4-CIM-A',
  year: 4,
  specialty: { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
  targetSpecialty: null,
  email: 'ons.bensalah@tek-up.de',
  availableToHelp: false,
  isMe: false,
  level: { rank: 2, roman: 'II', name: 'Bachelor' },
  points: 420,
  stats: { unverified: 1, preparing: 1, chaptersDone: 42, badges: 1 },
  collection: [
    {
      slug: 'clf-c02',
      code: 'CLF-C02',
      name: 'AWS Certified Cloud Practitioner',
      provider: aws,
      badgeAsset: null,
      status: 'unverified',
      since: '2026-10-05T10:00:00.000Z',
    },
  ],
  preparing: [
    {
      slug: 'saa-c03',
      code: 'SAA-C03',
      name: 'AWS Certified Solutions Architect – Associate',
      provider: aws,
      badgeAsset: null,
      pct: 45,
      done: null,
      total: null,
    },
  ],
  path: {
    code: 'CIM',
    name: 'Cloud Infrastructure Management',
    kind: 'specialty',
    heldCount: 1,
    total: 9,
  },
  badges: BADGE_KEYS.map((key) => ({
    key,
    earnedAt: key === 'first_step' ? '2026-10-01T10:00:00.000Z' : null,
  })),
  activity: [
    {
      id: uuid(50),
      kind: 'chapters_done',
      at: '2026-11-10T09:00:00.000Z',
      certification: { code: 'SAA-C03', slug: 'saa-c03' },
      count: 3,
      level: null,
      badge: null,
    },
  ],
  privacy: null,
  ...overrides,
});

describe('ProfileView', () => {
  it("shows a classmate's profile with a way to write to them", () => {
    render(<ProfileView profile={profile()} now={NOW} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ons Ben Salah' })).toBeInTheDocument();
    expect(screen.getByText('ING-4 CIM · group A')).toBeInTheDocument();
    // Once as the specialty pill, once as the path.
    expect(screen.getAllByText('CIM · Cloud Infrastructure Management')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Write to Ons/ })).toHaveAttribute(
      'href',
      'mailto:ons.bensalah@tek-up.de',
    );
    expect(screen.getByRole('link', { name: 'Back to community' })).toHaveAttribute(
      'href',
      '/community',
    );
    expect(screen.queryByRole('link', { name: /Edit profile/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();

    const level = screen.getByRole('region', { name: 'Level' });
    expect(level).toHaveTextContent('Level II');
    expect(level).toHaveTextContent('420 pts');
    expect(level).toHaveTextContent('580 points to Licentiate');

    const collection = screen.getByRole('region', { name: /Certification collection/ });
    expect(collection).toHaveTextContent('CLF-C02');
    expect(collection).toHaveTextContent('Unverified');
    expect(collection).toHaveTextContent('Declared Oct 2026');

    // A classmate's syllabus: the percentage, never the chapter counts.
    const preparing = screen.getByRole('region', { name: 'Preparing' });
    expect(preparing).toHaveTextContent('45% of the syllabus done');
    expect(preparing).not.toHaveTextContent('chapters');

    expect(screen.getByRole('region', { name: 'Path' })).toHaveTextContent('Their specialty');
    expect(screen.getByRole('region', { name: 'Path' })).toHaveTextContent('1/9');
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
    const activity = screen.getByRole('region', { name: 'Recent activity' });
    expect(activity).toHaveTextContent('finished 3 SAA-C03 chapters');
    expect(activity).toHaveTextContent('yesterday');
  });

  it('keeps hidden points hidden', () => {
    render(
      <ProfileView
        profile={profile({
          points: null,
          stats: { unverified: 1, preparing: 1, chaptersDone: null, badges: 1 },
        })}
        now={NOW}
      />,
    );
    const level = screen.getByRole('region', { name: 'Level' });
    expect(level).toHaveTextContent('Bachelor');
    expect(level).toHaveTextContent('Ons keeps their points private.');
    expect(level).not.toHaveTextContent('pts');
    expect(screen.getByText('Chapters done').parentElement).toHaveTextContent('Hidden');
  });

  it('shows the target specialty of an ING-2 student, and the empty lists', () => {
    render(
      <ProfileView
        profile={profile({
          classCode: 'ING-2-B',
          year: 2,
          specialty: null,
          targetSpecialty: { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
          collection: [],
          preparing: [],
          activity: [],
          path: {
            code: 'CIM',
            name: 'Cloud Infrastructure Management',
            kind: 'target',
            heldCount: 0,
            total: 9,
          },
        })}
        now={NOW}
      />,
    );
    expect(screen.getByText('ING-2 · group B')).toBeInTheDocument();
    expect(screen.getByText('Target specialty: CIM')).toBeInTheDocument();
    expect(screen.getByText('Ons hasn’t declared a certification yet.')).toBeInTheDocument();
    expect(screen.getByText('Nothing in progress right now.')).toBeInTheDocument();
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });

  it('shows my own profile with chapter counts, my privacy and the help switch', async () => {
    const user = userEvent.setup();
    const api = mockApi({ availableToHelp: true, leaderboardVisible: false });
    render(
      <ProfileView
        profile={profile({
          isMe: true,
          privacy: { leaderboardVisible: false },
          preparing: profile().preparing.map((cert) => ({ ...cert, done: 5, total: 11 })),
        })}
        now={NOW}
      />,
    );
    expect(screen.getByText('Visible to students')).toBeInTheDocument();
    expect(screen.getByText('Anonymous on leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit profile/ })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: /Write to/ })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preparing' })).toHaveTextContent(
      'SAA-C03 · 5/11 chapters',
    );
    expect(screen.getByRole('region', { name: 'Path' })).toHaveTextContent('My specialty');

    const help = screen.getByRole('switch', { name: 'Available to help' });
    expect(help).not.toBeChecked();
    await user.click(help);
    expect(help).toBeChecked();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const [url, init] = api.mock.calls[0] ?? [];
    expect(url).toBe('/api/me/profile');
    expect(init).toMatchObject({ method: 'PATCH', body: '{"availableToHelp":true}' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You now show as available to help',
    );
  });

  it('puts the switch back when saving fails', async () => {
    const user = userEvent.setup();
    mockApi({ type: 'about:blank', title: 'Server error', status: 500 }, 500);
    render(<ProfileView profile={profile({ isMe: true, availableToHelp: true })} now={NOW} />);
    const help = screen.getByRole('switch', { name: 'Available to help' });
    await user.click(help);
    expect(await screen.findByRole('status')).toHaveTextContent("Couldn't save. Try again.");
    expect(help).toBeChecked();
  });

  it('hides my name from the leaderboard and refreshes the profile', async () => {
    const user = userEvent.setup();
    const api = mockApi({ availableToHelp: false, leaderboardVisible: false });
    render(
      <ProfileView
        profile={profile({ isMe: true, privacy: { leaderboardVisible: true } })}
        now={NOW}
      />,
    );
    expect(screen.getByText('Visible on leaderboard')).toBeInTheDocument();
    const visible = screen.getByRole('switch', { name: 'Appear on the leaderboard' });
    expect(visible).toBeChecked();
    await user.click(visible);
    expect(visible).not.toBeChecked();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(api.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: '{"leaderboardVisible":false}',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You now appear as Anonymous on the leaderboard',
    );
    // The chips at the top come from the server.
    expect(router.refresh).toHaveBeenCalled();
  });

  it('copies the email and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<ProfileView profile={profile()} now={NOW} />);
    await user.click(screen.getByRole('button', { name: 'Copy email' }));
    expect(writeText).toHaveBeenCalledWith('ons.bensalah@tek-up.de');
    expect(await screen.findByRole('status')).toHaveTextContent('Email copied');
  });
});
