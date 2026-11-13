import type { LeaderboardRow, SpecialtyLeaderboard, StudentLeaderboard } from '@tekcert/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  boardPath,
  boardScopeLabels,
  boardSearch,
  changeLine,
  changeLook,
  gapSentence,
  parseBoardFilters,
} from './format';
import { LeaderboardView, type LeaderboardViewProps } from './LeaderboardView';

const NOW = '2026-11-12T09:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const viewer = { classCode: 'ING-4-CIM-A', year: 4 as const, specialty: 'CIM' as const };

const row = (position: number, overrides: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  rank: position,
  position,
  change: 0,
  points: 500 - position * 10,
  chapters: 50 - position,
  isMe: false,
  person: {
    id: uuid(position),
    firstName: 'Student',
    lastName: `Number${position}`,
    avatarPath: null,
    classCode: 'ING-4-CIM-A',
    year: 4,
    specialty: 'CIM',
  },
  ...overrides,
});

const students = (overrides: Partial<StudentLeaderboard> = {}): StudentLeaderboard => ({
  scope: 'specialty',
  period: 'month',
  periodLabel: 'November 2026',
  total: 68,
  rows: [
    row(1, { change: 2 }),
    row(2, { change: -1, person: null }),
    row(3),
    row(13),
    row(14, {
      isMe: true,
      change: 3,
      person: {
        id: uuid(99),
        firstName: 'Yassine',
        lastName: 'Ben Amor',
        avatarPath: null,
        classCode: 'ING-4-CIM-A',
        year: 4,
        specialty: 'CIM',
      },
    }),
    row(15, { change: null }),
  ],
  me: {
    rank: 14,
    points: 360,
    chapters: 36,
    change: 3,
    visible: true,
    gap: { points: 10, firstName: 'Karim' },
    continue: { slug: 'saa-c03', code: 'SAA-C03' },
  },
  viewer,
  ...overrides,
});

const specialties: SpecialtyLeaderboard = {
  period: 'month',
  periodLabel: 'November 2026',
  items: [
    {
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      hue: 225,
      rank: 1,
      students: 68,
      average: 412,
      isMine: true,
    },
    {
      code: 'SSIR',
      name: 'Systems Security',
      hue: 15,
      rank: 2,
      students: 1,
      average: 206,
      isMine: false,
    },
  ],
};

function view(overrides: Partial<LeaderboardViewProps> = {}) {
  return render(
    <LeaderboardView
      initialFilters={{ view: 'students', scope: 'specialty', period: 'month' }}
      initialStudents={students()}
      initialSpecialties={null}
      now={NOW}
      {...overrides}
    />,
  );
}

function mockApi(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const lastPath = (mock: ReturnType<typeof mockApi>) => String(mock.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  window.history.replaceState(null, '', '/leaderboard');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('leaderboard formatting', () => {
  it('reads the board from the URL and falls back to the defaults', () => {
    expect(parseBoardFilters({})).toEqual({
      view: 'students',
      scope: 'specialty',
      period: 'month',
    });
    expect(
      parseBoardFilters({ view: 'specialties', scope: ['class', 'x'], period: 'all' }),
    ).toEqual({ view: 'specialties', scope: 'class', period: 'all' });
    // "year" is a directory scope, not a leaderboard one.
    expect(parseBoardFilters({ view: 'teachers', scope: 'year', period: 'week' })).toEqual({
      view: 'students',
      scope: 'specialty',
      period: 'month',
    });
  });

  it('writes the URL without the defaults, and the API path in full', () => {
    expect(boardSearch({ view: 'students', scope: 'specialty', period: 'month' })).toBe('');
    expect(boardSearch({ view: 'students', scope: 'class', period: 'all' })).toBe(
      'scope=class&period=all',
    );
    // The specialties board has no scope.
    expect(boardSearch({ view: 'specialties', scope: 'class', period: 'semester' })).toBe(
      'view=specialties&period=semester',
    );
    expect(boardPath({ view: 'students', scope: 'institute', period: 'semester' })).toBe(
      '/leaderboard/students?scope=institute&period=semester',
    );
    expect(boardPath({ view: 'specialties', scope: 'class', period: 'all' })).toBe(
      '/leaderboard/specialties?period=all',
    );
  });

  it('names the scopes after the viewer', () => {
    expect(boardScopeLabels(viewer).map((s) => [s.long, s.position])).toEqual([
      ['My class', 'ING-4 A'],
      ['My specialty · CIM', 'CIM'],
      ['Whole institute', 'institute'],
    ]);
    expect(
      boardScopeLabels({ classCode: null, year: null, specialty: null }).map((s) => s.long),
    ).toEqual(['My class', 'My specialty', 'Whole institute']);
  });

  it('describes a change of places', () => {
    expect(changeLook(3)).toMatchObject({
      icon: 'arrow_upward',
      text: '3',
      label: 'Up 3 places this week',
    });
    expect(changeLook(-1)).toMatchObject({
      icon: 'arrow_downward',
      text: '1',
      label: 'Down 1 place this week',
    });
    expect(changeLook(0)).toMatchObject({ icon: 'remove', label: 'No change this week' });
    expect(changeLook(null)).toMatchObject({ icon: 'remove', label: 'Not ranked a week ago' });
    expect(changeLine(3)).toBe('↑ 3 places this week');
    expect(changeLine(-1)).toBe('↓ 1 place this week');
    expect(changeLine(0)).toBe('No change this week');
    expect(changeLine(null)).toBeNull();
  });

  it('says how far the next student is', () => {
    const me = students().me as NonNullable<StudentLeaderboard['me']>;
    expect(gapSentence(me, true)).toBe('10 points behind Karim. Each chapter you finish is +10.');
    expect(gapSentence({ ...me, gap: { points: 40, firstName: null } }, true)).toBe(
      '40 points behind the next student. Each chapter you finish is +10.',
    );
    expect(gapSentence({ ...me, gap: null }, true)).toBe('You’re in the lead.');
    expect(gapSentence({ ...me, gap: null }, false)).toBe(
      'Nobody has points here yet. Finish a chapter to take the lead.',
    );
  });
});

describe('LeaderboardView', () => {
  it('shows the ranked rows, my row and the rows left out', () => {
    view();
    const table = screen.getByRole('table', { name: 'Student leaderboard' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent('Student Number1');
    expect(within(rows[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      `/community/${uuid(1)}`,
    );
    expect(
      within(rows[0] as HTMLElement).getByLabelText('Up 2 places this week'),
    ).toBeInTheDocument();

    // A student who hides their name: ranked, without a name or a link.
    expect(rows[1]).toHaveTextContent('Anonymous');
    expect(within(rows[1] as HTMLElement).queryByRole('link')).not.toBeInTheDocument();

    expect(rows[4]).toHaveAttribute('aria-current', 'true');
    expect(rows[4]).toHaveTextContent('You · Yassine Ben Amor');
    expect(rows[4]).toHaveTextContent('360');
    // Positions 4 to 12 are left out: one gap marker, between the third row and the thirteenth.
    expect(table.querySelectorAll('[role="presentation"]')).toHaveLength(1);
  });

  it('shows my position, the gap and what to continue', () => {
    view();
    const card = screen.getByRole('region', { name: 'Your position' });
    expect(card).toHaveTextContent('Your position · CIM');
    expect(card).toHaveTextContent('14th');
    expect(card).toHaveTextContent('of 68');
    expect(card).toHaveTextContent('10 points behind Karim.');
    expect(within(card).getByRole('link', { name: 'Continue SAA-C03' })).toHaveAttribute(
      'href',
      '/catalog/saa-c03?tab=syllabus',
    );
    expect(screen.getByRole('link', { name: 'Hide my name from the leaderboard' })).toHaveAttribute(
      'href',
      '/profile#privacy',
    );
    expect(screen.getByRole('region', { name: 'Scoring' })).toHaveTextContent(
      'Path chapter completed+10',
    );
    // The phone's pinned row carries the same position.
    expect(screen.getByRole('group', { name: 'Your row' })).toHaveTextContent(
      '↑ 3 places this week · of 68',
    );
  });

  it('tells a student who hides their name how others see them', () => {
    const board = students();
    view({
      initialStudents: {
        ...board,
        me: {
          ...(board.me as NonNullable<StudentLeaderboard['me']>),
          visible: false,
          continue: null,
        },
      },
    });
    const card = screen.getByRole('region', { name: 'Your position' });
    expect(card).toHaveTextContent('Others see you as Anonymous.');
    expect(within(card).getByRole('link', { name: 'Pick a certification' })).toHaveAttribute(
      'href',
      '/catalog',
    );
    expect(
      screen.getByRole('link', { name: 'Show my name on the leaderboard' }),
    ).toBeInTheDocument();
  });

  it('switches scope and period: asks the API and updates the URL', async () => {
    const user = userEvent.setup();
    const api = mockApi(students({ scope: 'class', total: 24 }));
    view();
    const scope = screen.getByRole('group', { name: 'Scope' });
    expect(within(scope).getByRole('button', { name: /My specialty · CIM/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(scope).getByRole('button', { name: /My class/ }));
    await waitFor(() =>
      expect(lastPath(api)).toBe('/api/leaderboard/students?scope=class&period=month'),
    );
    expect(window.location.search).toBe('?scope=class');
    expect(await screen.findByText('of 24')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /Period/ }));
    await user.click(await screen.findByRole('option', { name: 'Semester 1 · 2026-27' }));
    await waitFor(() =>
      expect(lastPath(api)).toBe('/api/leaderboard/students?scope=class&period=semester'),
    );
    expect(window.location.search).toBe('?scope=class&period=semester');
  });

  it('shows the specialties with their average and marks mine', async () => {
    const user = userEvent.setup();
    const api = mockApi(specialties);
    view();
    const views = screen.getAllByRole('group', { name: 'View' })[0] as HTMLElement;
    await user.click(within(views).getByRole('button', { name: 'Specialties' }));
    await waitFor(() => expect(lastPath(api)).toBe('/api/leaderboard/specialties?period=month'));
    expect(window.location.search).toBe('?view=specialties');

    const board = await screen.findByRole('region', { name: 'Specialty leaderboard' });
    const items = within(board).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('CIM· yours');
    expect(items[0]).toHaveTextContent('68 students');
    expect(items[0]).toHaveTextContent('412');
    expect(items[1]).toHaveTextContent('1 student');
    expect(within(board).getByText('Average points per student · all years')).toBeInTheDocument();
    // No scope and no position on this board.
    expect(screen.queryByRole('group', { name: 'Scope' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your position' })).not.toBeInTheDocument();
  });

  it('says so when nobody has points in the period', () => {
    view({
      initialStudents: students({
        total: 2,
        rows: [
          row(1, { rank: 1, points: 0, chapters: 0 }),
          row(2, { rank: 1, points: 0, chapters: 0, isMe: true }),
        ],
        me: {
          rank: 1,
          points: 0,
          chapters: 0,
          change: null,
          visible: true,
          gap: null,
          continue: null,
        },
      }),
    });
    expect(
      screen.getByRole('heading', { name: 'No points yet in November 2026' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your position' })).toHaveTextContent(
      'Nobody has points here yet.',
    );
  });

  it('offers to try again when the board could not be loaded', async () => {
    const user = userEvent.setup();
    const api = mockApi(students());
    view({ initialStudents: null });
    expect(screen.getByRole('alert')).toHaveTextContent('The leaderboard could not be loaded.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('table', { name: 'Student leaderboard' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
