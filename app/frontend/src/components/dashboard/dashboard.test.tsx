import {
  type ActivityFeed,
  type ActivityItem,
  BADGE_KEYS,
  type ChapterTickResult,
  type Dashboard,
  levelFor,
} from '@tekcert/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileProgress } from '@/components/progress/ProfileProgress';
import { messageFor } from '@/components/progress/use-chapter-ticks';
import { DashboardError, errorCode } from './DashboardError';
import { DashboardView } from './DashboardView';
import { activityLine, semester, timeAgo, todayLabels } from './format';

const router = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const NOW = '2026-11-10T13:32:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const aws = { code: 'AWS', name: 'Amazon Web Services', hue: 55 };
const azure = { code: 'AZURE', name: 'Microsoft Azure', hue: 245 };
const noBadges = BADGE_KEYS.map((key) => ({ key, earnedAt: null }));

const chapters = Array.from({ length: 11 }, (_, i) => ({
  id: uuid(i + 1),
  order: i + 1,
  title: `Chapter ${i + 1}`,
  estimatedMinutes: 120,
  done: i < 5,
}));

function filled(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    firstName: 'Yassine',
    group: 'ING-4 CIM',
    specialty: 'CIM',
    points: 1480,
    level: levelFor(1480),
    badges: noBadges.map((b) =>
      b.key === 'first_step' ? { ...b, earnedAt: '2026-10-01T10:00:00.000Z' } : b,
    ),
    current: {
      slug: 'saa-c03',
      code: 'SAA-C03',
      name: 'AWS Solutions Architect – Associate',
      level: 'associate',
      provider: aws,
      badgeAsset: null,
      startedAt: '2026-09-02T10:00:00.000Z',
      done: 5,
      total: 11,
      pct: 45,
      chapters,
    },
    next: {
      slug: 'az-104',
      code: 'AZ-104',
      name: 'Microsoft Azure Administrator',
      level: 'associate',
      provider: azure,
      badgeAsset: null,
      chapterCount: 9,
      studyMinutes: 1500,
      after: 'AZ-900',
      earnedInGroup: 9,
    },
    path: {
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      kind: 'specialty',
      heldCount: 2,
      nodes: [
        { code: 'CLF-C02', slug: 'clf-c02', state: 'held' },
        { code: 'SAA-C03', slug: 'saa-c03', state: 'in_progress' },
        { code: 'SOA-C03', slug: 'soa-c03', state: 'locked' },
      ],
    },
    alsoPreparing: {
      total: 1,
      items: [
        {
          id: uuid(90),
          firstName: 'Skander',
          lastName: 'Bouazizi',
          avatarPath: null,
          group: 'ING-4 CIM',
          pct: 72,
        },
      ],
    },
    groupStarted: { total: 0, items: [] },
    empty: false,
    ...overrides,
  };
}

const person = { id: uuid(80), firstName: 'Ons', lastName: 'Ben Salah', avatarPath: null };
const item = (overrides: Partial<ActivityItem>): ActivityItem => ({
  id: uuid(70),
  kind: 'chapters_done',
  at: '2026-11-10T11:30:00.000Z',
  person: { ...person, group: 'ING-4 CIM' },
  certification: { code: 'AZ-104', slug: 'az-104' },
  count: 3,
  level: null,
  badge: null,
  ...overrides,
});
const feed: ActivityFeed = { items: [item({})] };

function tickResult(done: number, delta = 10, points = 1490): ChapterTickResult {
  return {
    changed: true,
    delta,
    certification: { slug: 'saa-c03', done, total: 11, pct: Math.round((done / 11) * 100) },
    points,
    level: levelFor(points),
    newBadges: [],
  };
}

function mockFetch(...answers: { body: unknown; status?: number }[]) {
  const queue = [...answers];
  const fetchMock = vi.fn(async () => {
    const next = queue.shift() ?? answers[answers.length - 1];
    return Response.json(next?.body ?? {}, { status: next?.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  router.refresh.mockReset();
});

describe('format', () => {
  it('names the semester and the day in Tunis', () => {
    expect(semester(new Date('2026-10-09T12:00:00Z'))).toBe('Fall semester');
    expect(semester(new Date('2027-01-15T12:00:00Z'))).toBe('Fall semester');
    expect(semester(new Date('2027-03-01T12:00:00Z'))).toBe('Spring semester');
    expect(todayLabels(new Date('2026-10-09T12:00:00Z'))).toEqual({
      long: 'Friday, October 9, 2026 · Fall semester',
      short: 'Friday, October 9',
    });
  });

  it('says how long ago, by Tunis calendar day', () => {
    const now = new Date(NOW);
    expect(timeAgo('2026-11-10T13:31:40Z', now)).toBe('just now');
    expect(timeAgo('2026-11-10T13:07:00Z', now)).toBe('25 min ago');
    expect(timeAgo('2026-11-10T11:30:00Z', now)).toBe('2 h ago');
    expect(timeAgo('2026-11-09T20:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-11-07T09:00:00Z', now)).toBe('3 days ago');
    expect(timeAgo('2026-10-02T09:00:00Z', now)).toBe('Oct 2');
  });

  it('writes each kind of activity line', () => {
    expect(activityLine(item({})).what).toBe('finished 3 AZ-104 chapters');
    expect(activityLine(item({ count: 1 })).what).toBe('finished 1 AZ-104 chapter');
    expect(activityLine(item({ kind: 'certification_started' })).what).toBe('started AZ-104');
    expect(activityLine(item({ kind: 'level_reached', level: 4 })).what).toBe(
      'reached Master level',
    );
    expect(activityLine(item({ kind: 'badge_earned', badge: 'first_step' }))).toMatchObject({
      what: 'earned the First step badge',
      icon: 'footprint',
    });
    expect(activityLine(item({ kind: 'syllabus_completed' })).what).toBe(
      'completed the AZ-104 syllabus',
    );
  });

  it('words the tick toast', () => {
    expect(messageFor(tickResult(6), true)).toBe('Chapter done · +10 points');
    expect(messageFor(tickResult(5, -10), false)).toBe('Chapter unticked · −10 points');
    expect(messageFor(tickResult(11), true)).toBe('Syllabus complete · you’re ready for the exam');
    expect(messageFor({ ...tickResult(1), newBadges: ['first_step'] }, true)).toBe(
      'Chapter done · +10 points · First step badge earned',
    );
  });
});

describe('DashboardView', () => {
  const view = (dashboard = filled(), activity: ActivityFeed | null = feed) =>
    render(<DashboardView dashboard={dashboard} activity={activity} now={NOW} />);

  it('shows the filled dashboard', () => {
    view();
    expect(screen.getByRole('heading', { level: 1, name: 'Hello Yassine' })).toBeInTheDocument();
    expect(screen.getByText('Tuesday, November 10, 2026 · Fall semester')).toBeInTheDocument();
    const current = screen.getByRole('region', { name: 'Current certification' });
    expect(current).toHaveTextContent('5/11 chapters');
    // The window starts one before the first chapter left: 05 to 08.
    const boxes = within(current).getAllByRole('checkbox');
    expect(boxes.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Chapter 5'),
      expect.stringContaining('Chapter 6'),
      expect.stringContaining('Chapter 7'),
      expect.stringContaining('Chapter 8'),
    ]);
    // [0] is the phone strip, [1] the desktop card (CSS picks one; jsdom renders both).
    const level = screen.getAllByRole('region', { name: 'My level' })[1];
    expect(level).toHaveTextContent('Licentiate');
    expect(level).toHaveTextContent('1,480');
    expect(level).toHaveTextContent('1,020 points to Master');
    expect(level).toHaveTextContent('1 of 5 badges');
    expect(
      screen.getByText('Extend your Azure branch after AZ-900. 9 ING-4 CIM students earned it.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'My path' })).toHaveTextContent(
      "Your specialty's path · 2 of 3 earned",
    );
    expect(screen.getByText('Also preparing SAA-C03')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Classmate activity' })).toHaveTextContent(
      'Ons finished 3 AZ-104 chapters',
    );
  });

  it('ticks a chapter at once, then confirms the points with Undo', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ body: tickResult(6) }, { body: tickResult(5, -10, 1480) });
    view();
    const box = screen.getByRole('checkbox', { name: /Chapter 6/ });
    await user.click(box);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/me/chapters/${uuid(6)}`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(screen.getByRole('checkbox', { name: /Chapter 6/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Chapter done · +10 points');
    expect(screen.getAllByRole('region', { name: 'My level' })[0]).toHaveTextContent('1,490');

    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/me/chapters/${uuid(6)}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Chapter unticked · −10 points');
    expect(within(screen.getByRole('status')).queryByRole('button')).toBeNull();
  });

  it('puts the box back and says so when the API refuses', async () => {
    const user = userEvent.setup();
    mockFetch({
      body: { type: 'urn:x', title: 'Conflict', status: 409, detail: 'Start SAA-C03 first.' },
      status: 409,
    });
    view();
    await user.click(screen.getByRole('checkbox', { name: /Chapter 6/ }));
    expect(screen.getByRole('checkbox', { name: /Chapter 6/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Start SAA-C03 first.');
  });

  it('switches the activity scope', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      body: { items: [item({ id: uuid(71), kind: 'certification_started' })] },
    });
    view();
    await user.click(screen.getByRole('button', { name: /Whole institute/ }));
    expect(fetchMock).toHaveBeenCalledWith('/api/activity?scope=institute', expect.anything());
    expect(await screen.findByText(/started AZ-104/)).toBeInTheDocument();
  });

  it('shows the empty dashboard with Start for a new student', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      body: { slug: 'clf-c02', status: 'in_progress', since: NOW },
      status: 201,
    });
    view(
      filled({
        points: 0,
        level: levelFor(0),
        badges: noBadges,
        current: null,
        empty: true,
        next: {
          slug: 'clf-c02',
          code: 'CLF-C02',
          name: 'AWS Cloud Practitioner',
          level: 'foundational',
          provider: aws,
          badgeAsset: null,
          chapterCount: 6,
          studyMinutes: 1200,
          after: null,
          earnedInGroup: 0,
        },
        groupStarted: {
          total: 12,
          items: [
            {
              id: uuid(60),
              firstName: 'Skander',
              lastName: 'B',
              avatarPath: null,
              group: 'ING-4 CIM',
            },
          ],
        },
      }),
    );
    expect(screen.getByText('Welcome to TekCert')).toBeInTheDocument();
    expect(screen.getByText('Finish a chapter to earn your first 10 points')).toBeInTheDocument();
    const start = screen.getByRole('region', { name: 'Get started' });
    expect(start).toHaveTextContent('Your path · CIM');
    expect(start).toHaveTextContent('Start with AWS Cloud Practitioner');
    expect(start).toHaveTextContent('Foundational level · 6 chapters · about 20 h of prep');
    expect(
      screen.getByText('12 ING-4 CIM students are already preparing or hold a certification'),
    ).toBeInTheDocument();
    expect(screen.getByText('+11')).toBeInTheDocument();

    await user.click(within(start).getByRole('button', { name: 'Start' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/preparations/clf-c02',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps the dashboard when only the feed failed', async () => {
    view(filled(), null);
    const activity = screen.getByRole('region', { name: 'Classmate activity' });
    expect(activity).toHaveTextContent("The activity couldn't be loaded.");
    expect(within(activity).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('DashboardError', () => {
  it('explains, offers a retry and gives a code', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<DashboardError error={new Error('fetch failed')} onRetry={onRetry} />);
    expect(
      screen.getByRole('heading', { name: "Couldn't load your dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Code ERR_NETWORK · /)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
  });

  it('turns an HTTP status into a code', () => {
    expect(errorCode(new Error('API responded with 502'))).toBe('ERR_HTTP_502');
  });
});

describe('ProfileProgress', () => {
  it('shows the level and every badge, locked ones with their rule', () => {
    render(
      <ProfileProgress
        points={{
          points: 420,
          level: levelFor(420),
          badges: noBadges.map((b) =>
            b.key === 'first_step' ? { ...b, earnedAt: '2026-10-01T10:00:00.000Z' } : b,
          ),
        }}
      />,
    );
    const level = screen.getByRole('region', { name: 'My level' });
    expect(level).toHaveTextContent('Level II');
    expect(level).toHaveTextContent('Bachelor');
    expect(level).toHaveTextContent('580 points to Licentiate');
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
    expect(screen.getByText(/First step/)).toHaveTextContent('First step, earned');
    expect(screen.getByText(/Dedicated/)).toHaveTextContent(
      'Dedicated, locked: 30 chapters completed · to unlock',
    );
    expect(screen.getByText(/Pioneer/)).toHaveTextContent('coming in a later release');
  });
});
