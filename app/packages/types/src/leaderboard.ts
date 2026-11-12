import { z } from 'zod';
import { SlugSchema, SpecialtyCodeSchema, SpecialtySchema } from './catalog.js';
import { YearSchema } from './onboarding.js';

/** Whose ranking, relative to the student asking. */
export const LEADERBOARD_SCOPES = ['class', 'specialty', 'institute'] as const;
export const LeaderboardScopeSchema = z.enum(LEADERBOARD_SCOPES);
export type LeaderboardScope = z.infer<typeof LeaderboardScopeSchema>;

export const LEADERBOARD_PERIODS = ['month', 'semester', 'all'] as const;
export const LeaderboardPeriodSchema = z.enum(LEADERBOARD_PERIODS);
export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriodSchema>;

export const LeaderboardQuerySchema = z.object({
  scope: LeaderboardScopeSchema.default('specialty'),
  period: LeaderboardPeriodSchema.default('month'),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export const SpecialtyBoardQuerySchema = z.object({
  period: LeaderboardPeriodSchema.default('month'),
});
export type SpecialtyBoardQuery = z.infer<typeof SpecialtyBoardQuerySchema>;

/** Rows shown from the top, and rows kept on each side of the student asking. */
export const LEADERBOARD_TOP = 20;
export const LEADERBOARD_AROUND = 2;
/** "Change" compares with the ranking this many days ago. */
export const LEADERBOARD_CHANGE_DAYS = 7;

/**
 * TEK-UP is in Tunis, which stays on UTC+1 all year (no daylight saving since 2009), so months
 * and semesters start at midnight +01:00.
 */
const TUNIS_OFFSET = '+01:00';
const tunisParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Tunis',
  year: 'numeric',
  month: 'numeric',
});

function tunisYearMonth(now: Date): { year: number; month: number } {
  const parts = tunisParts.formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month') };
}

const startOf = (year: number, month: number) =>
  new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00${TUNIS_OFFSET}`);

/**
 * The academic semester a date falls in. Semester 1 runs 1 September to 31 January, Semester 2
 * runs 1 February to 31 August (decision 2026-11-11).
 */
export function semesterOf(now: Date): { number: 1 | 2; academicYear: number; start: Date } {
  const { year, month } = tunisYearMonth(now);
  if (month >= 9) return { number: 1, academicYear: year, start: startOf(year, 9) };
  if (month === 1) return { number: 1, academicYear: year - 1, start: startOf(year - 1, 9) };
  return { number: 2, academicYear: year - 1, start: startOf(year, 2) };
}

/** When the period began: the 1st of the month or of the semester in Tunis; null for all time. */
export function periodStart(period: LeaderboardPeriod, now: Date): Date | null {
  if (period === 'all') return null;
  if (period === 'semester') return semesterOf(now).start;
  const { year, month } = tunisYearMonth(now);
  return startOf(year, month);
}

const monthName = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Tunis',
  month: 'long',
  year: 'numeric',
});

/** "November 2026", "Semester 1 · 2026-27", "All time". */
export function periodLabel(period: LeaderboardPeriod, now: Date): string {
  if (period === 'all') return 'All time';
  if (period === 'month') return monthName.format(now);
  const { number, academicYear } = semesterOf(now);
  return `Semester ${number} · ${academicYear}-${String((academicYear + 1) % 100).padStart(2, '0')}`;
}

export interface RankInput {
  id: string;
  points: number;
}

/**
 * Orders by points, highest first, and gives tied students the same rank (1, 1, 3). Ties are
 * ordered by id, which says nothing about who is behind an anonymous row.
 */
export function rankByPoints<T extends RankInput>(
  entries: readonly T[],
): (T & { rank: number; position: number })[] {
  const sorted = [...entries].sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.points !== sorted[index - 1]?.points) rank = index + 1;
    return { ...entry, rank, position: index + 1 };
  });
}

/**
 * Which positions (1-based) a board shows: the first `top`, plus the viewer with `around` rows
 * on each side when they are further down.
 */
export function boardPositions(
  total: number,
  mine: number | null,
  top = LEADERBOARD_TOP,
  around = LEADERBOARD_AROUND,
): number[] {
  const positions = new Set<number>();
  for (let p = 1; p <= Math.min(top, total); p++) positions.add(p);
  if (mine !== null) {
    for (let p = Math.max(1, mine - around); p <= Math.min(total, mine + around); p++) {
      positions.add(p);
    }
  }
  return [...positions].sort((a, b) => a - b);
}

/** "1st", "2nd", "3rd", "11th", "22nd": the suffix only. */
export function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo > 10 && lastTwo < 14) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
}

/** A ranked student as others may see them. */
export const LeaderboardPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarPath: z.string().nullable(),
  classCode: z.string(),
  year: YearSchema,
  specialty: SpecialtyCodeSchema.nullable(),
});
export type LeaderboardPerson = z.infer<typeof LeaderboardPersonSchema>;

export const LeaderboardRowSchema = z.object({
  /** Tied students share a rank. */
  rank: z.number().int().positive(),
  /** Place in the list, 1-based: a jump between two rows means rows were left out. */
  position: z.number().int().positive(),
  /**
   * Places gained (positive) or lost over the last 7 days; null when the period is younger
   * than that.
   */
  change: z.number().int().nullable(),
  /** `SUM(delta)` of the ledger over the period. Negative when unticks outweigh ticks. */
  points: z.number().int(),
  /** Chapters finished in the period, net of unticks. */
  chapters: z.number().int(),
  isMe: z.boolean(),
  /** Null for a student who hides their name: shown as "Anonymous". Never null on my own row. */
  person: LeaderboardPersonSchema.nullable(),
});
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;

export const LeaderboardMeSchema = z.object({
  rank: z.number().int().positive(),
  points: z.number().int(),
  chapters: z.number().int(),
  change: z.number().int().nullable(),
  /** False when I hide my name: others see my row as "Anonymous". */
  visible: z.boolean(),
  /** The nearest student with more points; null when nobody has more. */
  gap: z
    .object({
      points: z.number().int().positive(),
      /** Null when that student hides their name. */
      firstName: z.string().nullable(),
    })
    .nullable(),
  /** The certification in progress I touched last. */
  continue: z.object({ slug: SlugSchema, code: z.string() }).nullable(),
});
export type LeaderboardMe = z.infer<typeof LeaderboardMeSchema>;

export const LeaderboardViewerSchema = z.object({
  classCode: z.string().nullable(),
  year: YearSchema.nullable(),
  /** Class specialty, or the one aimed for in ING-1 to 3. */
  specialty: SpecialtyCodeSchema.nullable(),
});

export const StudentLeaderboardSchema = z.object({
  scope: LeaderboardScopeSchema,
  period: LeaderboardPeriodSchema,
  periodLabel: z.string(),
  /** Students ranked in this scope. */
  total: z.number().int().nonnegative(),
  rows: z.array(LeaderboardRowSchema),
  /** Null when I am not in the scope (no class saved yet). */
  me: LeaderboardMeSchema.nullable(),
  viewer: LeaderboardViewerSchema,
});
export type StudentLeaderboard = z.infer<typeof StudentLeaderboardSchema>;

export const SpecialtyRowSchema = SpecialtySchema.extend({
  rank: z.number().int().positive(),
  students: z.number().int().positive(),
  /** Points per student over the period, rounded. */
  average: z.number().int(),
  isMine: z.boolean(),
});
export type SpecialtyRow = z.infer<typeof SpecialtyRowSchema>;

export const SpecialtyLeaderboardSchema = z.object({
  period: LeaderboardPeriodSchema,
  periodLabel: z.string(),
  items: z.array(SpecialtyRowSchema),
});
export type SpecialtyLeaderboard = z.infer<typeof SpecialtyLeaderboardSchema>;
