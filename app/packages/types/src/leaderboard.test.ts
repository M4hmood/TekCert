import { describe, expect, it } from 'vitest';
import {
  boardPositions,
  LeaderboardQuerySchema,
  ordinalSuffix,
  periodLabel,
  periodStart,
  rankByPoints,
  semesterOf,
} from './leaderboard.js';

const at = (iso: string) => new Date(iso);

describe('periodStart', () => {
  it('starts the month at midnight in Tunis', () => {
    expect(periodStart('month', at('2026-11-11T09:00:00Z'))?.toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
  });

  it('follows the Tunis calendar around midnight', () => {
    // 23:30 UTC on 31 October is already 1 November in Tunis.
    expect(periodStart('month', at('2026-10-31T23:30:00Z'))?.toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
    expect(periodStart('month', at('2026-10-31T22:30:00Z'))?.toISOString()).toBe(
      '2026-09-30T23:00:00.000Z',
    );
  });

  it('starts Semester 1 on 1 September and Semester 2 on 1 February', () => {
    expect(periodStart('semester', at('2026-11-11T09:00:00Z'))?.toISOString()).toBe(
      '2026-08-31T23:00:00.000Z',
    );
    // January still belongs to the semester that began in September.
    expect(periodStart('semester', at('2027-01-20T09:00:00Z'))?.toISOString()).toBe(
      '2026-08-31T23:00:00.000Z',
    );
    expect(periodStart('semester', at('2027-02-01T09:00:00Z'))?.toISOString()).toBe(
      '2027-01-31T23:00:00.000Z',
    );
    expect(periodStart('semester', at('2027-08-31T12:00:00Z'))?.toISOString()).toBe(
      '2027-01-31T23:00:00.000Z',
    );
  });

  it('has no start for all time', () => {
    expect(periodStart('all', at('2026-11-11T09:00:00Z'))).toBeNull();
  });
});

describe('periodLabel and semesterOf', () => {
  it('names the month, the semester and all time', () => {
    const now = at('2026-11-11T09:00:00Z');
    expect(periodLabel('month', now)).toBe('November 2026');
    expect(periodLabel('semester', now)).toBe('Semester 1 · 2026-27');
    expect(periodLabel('all', now)).toBe('All time');
    expect(periodLabel('semester', at('2027-01-15T09:00:00Z'))).toBe('Semester 1 · 2026-27');
    expect(periodLabel('semester', at('2027-03-15T09:00:00Z'))).toBe('Semester 2 · 2026-27');
  });

  it('keeps the academic year across the new year', () => {
    expect(semesterOf(at('2027-01-15T09:00:00Z'))).toMatchObject({ number: 1, academicYear: 2026 });
    expect(semesterOf(at('2027-09-01T09:00:00Z'))).toMatchObject({ number: 1, academicYear: 2027 });
  });
});

describe('rankByPoints', () => {
  it('orders by points and shares a rank between ties', () => {
    const ranked = rankByPoints([
      { id: 'c', points: 50 },
      { id: 'a', points: 120 },
      { id: 'd', points: 50 },
      { id: 'b', points: 120 },
      { id: 'e', points: 0 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank, r.position])).toEqual([
      ['a', 1, 1],
      ['b', 1, 2],
      ['c', 3, 3],
      ['d', 3, 4],
      ['e', 5, 5],
    ]);
  });

  it('ranks everyone first when nobody has points, and handles negatives', () => {
    expect(
      rankByPoints([
        { id: 'a', points: 0 },
        { id: 'b', points: 0 },
      ]).map((r) => r.rank),
    ).toEqual([1, 1]);
    expect(
      rankByPoints([
        { id: 'a', points: -10 },
        { id: 'b', points: 0 },
      ]).map((r) => r.id),
    ).toEqual(['b', 'a']);
    expect(rankByPoints([])).toEqual([]);
  });
});

describe('boardPositions', () => {
  it('shows the top, then the viewer with two neighbours on each side', () => {
    expect(boardPositions(100, 40, 3, 2)).toEqual([1, 2, 3, 38, 39, 40, 41, 42]);
  });

  it('merges the window into the top when they touch', () => {
    expect(boardPositions(100, 4, 3, 2)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(boardPositions(100, 1, 3, 2)).toEqual([1, 2, 3]);
  });

  it('stops at the end of the board', () => {
    expect(boardPositions(10, 10, 3, 2)).toEqual([1, 2, 3, 8, 9, 10]);
    expect(boardPositions(2, null, 20)).toEqual([1, 2]);
    expect(boardPositions(0, null)).toEqual([]);
  });
});

describe('ordinalSuffix', () => {
  it.each([
    [1, 'st'],
    [2, 'nd'],
    [3, 'rd'],
    [4, 'th'],
    [11, 'th'],
    [12, 'th'],
    [13, 'th'],
    [21, 'st'],
    [102, 'nd'],
    [113, 'th'],
  ])('%i → %s', (n, suffix) => {
    expect(ordinalSuffix(n)).toBe(suffix);
  });
});

describe('LeaderboardQuerySchema', () => {
  it('defaults to my specialty this month and rejects the directory-only scope', () => {
    expect(LeaderboardQuerySchema.parse({})).toEqual({ scope: 'specialty', period: 'month' });
    expect(LeaderboardQuerySchema.safeParse({ scope: 'year' }).success).toBe(false);
    expect(LeaderboardQuerySchema.safeParse({ period: 'week' }).success).toBe(false);
  });
});
