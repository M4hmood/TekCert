import { z } from 'zod';
import {
  CertificationLevelSchema,
  ProviderSchema,
  SlugSchema,
  SpecialtyCodeSchema,
} from './catalog.js';
import { CommunityScopeSchema, MyCertificationStatusSchema } from './community.js';

/** Release 1: chapters are the only source of points (PLAN.md › Note on MVP scope). */
export const POINTS_PER_CHAPTER = 10;

/** Recognition levels (Design-System › Recognition), separate from the ING-1…5 years. */
export const LEVELS = [
  { rank: 1, roman: 'I', name: 'Novice', min: 0 },
  { rank: 2, roman: 'II', name: 'Bachelor', min: 250 },
  { rank: 3, roman: 'III', name: 'Licentiate', min: 1000 },
  { rank: 4, roman: 'IV', name: 'Master', min: 2500 },
  { rank: 5, roman: 'V', name: 'Emeritus', min: 5000 },
] as const;
export const LEVEL_NAMES = ['Novice', 'Bachelor', 'Licentiate', 'Master', 'Emeritus'] as const;
export const LevelRankSchema = z.number().int().min(1).max(5);

export const LevelSchema = z.object({
  rank: LevelRankSchema,
  roman: z.string(),
  name: z.enum(LEVEL_NAMES),
  /** Points needed to reach this level. */
  min: z.number().int().nonnegative(),
  /** The next level, or null at Emeritus. */
  next: z.object({ name: z.enum(LEVEL_NAMES), min: z.number().int().positive() }).nullable(),
  /** Points still needed for the next level; null at Emeritus. */
  toNext: z.number().int().positive().nullable(),
  /** How far along this level the student is, 0 to 1 (1 at Emeritus). */
  progress: z.number().min(0).max(1),
});
export type Level = z.infer<typeof LevelSchema>;

/** The level a points total gives: 1,480 → Licentiate, 32 % of the way, 1,020 to Master. */
export function levelFor(points: number): Level {
  const total = Math.max(0, Math.floor(points));
  let index = 0;
  for (const [i, level] of LEVELS.entries()) if (total >= level.min) index = i;
  const level = LEVELS[index] ?? LEVELS[0];
  const next = LEVELS[index + 1];
  return {
    rank: level.rank,
    roman: level.roman,
    name: level.name,
    min: level.min,
    next: next ? { name: next.name, min: next.min } : null,
    toNext: next ? next.min - total : null,
    progress: next ? (total - level.min) / (next.min - level.min) : 1,
  };
}

/** The level for a rank (1–5), for activity lines such as "reached Master level". */
export function levelName(rank: number): (typeof LEVEL_NAMES)[number] {
  return (LEVELS.find((level) => level.rank === rank) ?? LEVELS[0]).name;
}

/** Order as on the profile design. */
export const BADGE_KEYS = [
  'first_step',
  'pioneer',
  'flawless',
  'multi_cloud',
  'dedicated',
] as const;
export const BadgeKeySchema = z.enum(BADGE_KEYS);
export type BadgeKey = z.infer<typeof BadgeKeySchema>;

/** Chapters completed at the same time that unlock "Dedicated". */
export const DEDICATED_CHAPTERS = 30;

export interface BadgeDefinition {
  name: string;
  /** Material Symbols name. */
  icon: string;
  description: string;
  /** False for badges whose rule needs Release 2 (verified certifications, practice tests). */
  available: boolean;
}

export const BADGES: Record<BadgeKey, BadgeDefinition> = {
  first_step: {
    name: 'First step',
    icon: 'footprint',
    description: 'First chapter completed',
    available: true,
  },
  pioneer: {
    name: 'Pioneer',
    icon: 'flag',
    description: 'First verified certification',
    available: false,
  },
  flawless: {
    name: 'Flawless',
    icon: 'target',
    description: '100% on a practice test',
    available: false,
  },
  multi_cloud: {
    name: 'Multi-cloud',
    icon: 'cloud',
    description: 'Certified with 3 providers',
    available: false,
  },
  dedicated: {
    name: 'Dedicated',
    icon: 'local_library',
    description: `${DEDICATED_CHAPTERS} chapters completed`,
    available: true,
  },
};

/** The badges a number of completed chapters qualifies for. Earned badges are kept for good. */
export function badgesForChapters(completedChapters: number): BadgeKey[] {
  const keys: BadgeKey[] = [];
  if (completedChapters >= 1) keys.push('first_step');
  if (completedChapters >= DEDICATED_CHAPTERS) keys.push('dedicated');
  return keys;
}

/** Rounded percentage of the syllabus done; 0 for an empty syllabus. */
export function percentDone(done: number, total: number): number {
  return total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;
}

/**
 * Where a short list of `size` chapters starts: one before the first chapter left to do, so the
 * last one done stays in sight, and never past the end.
 */
export function chapterWindowStart(done: readonly boolean[], size: number): number {
  let first = done.indexOf(false);
  if (first < 0) first = done.length;
  return Math.max(0, Math.min(first - 1, done.length - size));
}

export const BadgeStateSchema = z.object({
  key: BadgeKeySchema,
  /** When it was earned; null while locked. */
  earnedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type BadgeState = z.infer<typeof BadgeStateSchema>;

export const MyPointsSchema = z.object({
  points: z.number().int().nonnegative(),
  level: LevelSchema,
  /** All five, in BADGE_KEYS order. */
  badges: z.array(BadgeStateSchema),
});
export type MyPoints = z.infer<typeof MyPointsSchema>;

export const ChapterParamsSchema = z.object({ chapterId: z.uuid() });

export const SyllabusProgressSchema = z.object({
  slug: SlugSchema,
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  pct: z.number().int().min(0).max(100),
});
export type SyllabusProgress = z.infer<typeof SyllabusProgressSchema>;

/** The answer to ticking or unticking a chapter. */
export const ChapterTickResultSchema = z.object({
  /** False when the chapter was already in that state: nothing was recorded. */
  changed: z.boolean(),
  /** Points this request added: +10, −10 or 0. */
  delta: z.number().int(),
  certification: SyllabusProgressSchema,
  points: z.number().int().nonnegative(),
  level: LevelSchema,
  /** Badges this tick unlocked. */
  newBadges: z.array(BadgeKeySchema),
});
export type ChapterTickResult = z.infer<typeof ChapterTickResultSchema>;

/** My relationship to one certification, with the chapters I ticked. */
export const MyCertificationProgressSchema = SyllabusProgressSchema.extend({
  /** Null when I neither hold nor prepare it. */
  status: MyCertificationStatusSchema.nullable(),
  since: z.iso.datetime({ offset: true }).nullable(),
  doneChapterIds: z.array(z.uuid()),
});
export type MyCertificationProgress = z.infer<typeof MyCertificationProgressSchema>;

export const PROGRESS_PROBLEM = {
  notPreparing: 'urn:tekcert:problem:certification-not-in-progress',
} as const;

/** Path nodes on the dashboard. Release 1: every held certification is unverified. */
export const DASHBOARD_PATH_NODE_STATES = ['held', 'in_progress', 'available', 'locked'] as const;
export const DashboardPathNodeStateSchema = z.enum(DASHBOARD_PATH_NODE_STATES);
export type DashboardPathNodeState = z.infer<typeof DashboardPathNodeStateSchema>;

export const DashboardChapterSchema = z.object({
  id: z.uuid(),
  order: z.number().int().positive(),
  title: z.string(),
  estimatedMinutes: z.number().int().positive(),
  done: z.boolean(),
});
export type DashboardChapter = z.infer<typeof DashboardChapterSchema>;

const CertificationCardSchema = z.object({
  slug: SlugSchema,
  code: z.string(),
  name: z.string(),
  level: CertificationLevelSchema,
  provider: ProviderSchema,
  badgeAsset: z.string().nullable(),
});

export const DashboardCurrentSchema = CertificationCardSchema.extend({
  startedAt: z.iso.datetime({ offset: true }),
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  pct: z.number().int().min(0).max(100),
  chapters: z.array(DashboardChapterSchema),
});
export type DashboardCurrent = z.infer<typeof DashboardCurrentSchema>;

export const DashboardNextSchema = CertificationCardSchema.extend({
  chapterCount: z.number().int().nonnegative(),
  /** Sum of the chapters' estimated study time. */
  studyMinutes: z.number().int().nonnegative(),
  /** The path prerequisite I hold, which this one builds on. */
  after: z.string().nullable(),
  /** Students of my year and specialty who hold it. */
  earnedInGroup: z.number().int().nonnegative(),
});
export type DashboardNext = z.infer<typeof DashboardNextSchema>;

export const DashboardPathSchema = z.object({
  /** CIM, SSIR… or FOND for the Fundamentals path. */
  code: z.string(),
  name: z.string(),
  /** Whose path it is: my class specialty, the one I aim for (ING-1…3), or Fundamentals. */
  kind: z.enum(['specialty', 'target', 'fundamentals']),
  heldCount: z.number().int().nonnegative(),
  nodes: z.array(
    z.object({ code: z.string(), slug: SlugSchema, state: DashboardPathNodeStateSchema }),
  ),
});
export type DashboardPath = z.infer<typeof DashboardPathSchema>;

/** A classmate as the dashboard shows them: no email, no class details beyond the label. */
export const DashboardPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarPath: z.string().nullable(),
  /** "ING-4 CIM", "ING-2". */
  group: z.string(),
});
export type DashboardPerson = z.infer<typeof DashboardPersonSchema>;

export const DashboardSchema = z.object({
  firstName: z.string(),
  /** My year and specialty, "ING-4 CIM"; null before onboarding saved a class. */
  group: z.string().nullable(),
  specialty: SpecialtyCodeSchema.nullable(),
  points: z.number().int().nonnegative(),
  level: LevelSchema,
  badges: z.array(BadgeStateSchema),
  /** The certification in progress I touched last. */
  current: DashboardCurrentSchema.nullable(),
  next: DashboardNextSchema.nullable(),
  path: DashboardPathSchema.nullable(),
  /** Students of my specialty, all years, preparing `current`, highest percentage first. */
  alsoPreparing: z.object({
    total: z.number().int().nonnegative(),
    items: z.array(DashboardPersonSchema.extend({ pct: z.number().int().min(0).max(100) })),
  }),
  /** Empty state: students of my group who hold or prepare a certification. */
  groupStarted: z.object({
    total: z.number().int().nonnegative(),
    items: z.array(DashboardPersonSchema),
  }),
  /** Nothing in progress and no points yet. */
  empty: z.boolean(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const ACTIVITY_KINDS = [
  'certification_started',
  'chapters_done',
  'syllabus_completed',
  'badge_earned',
  'level_reached',
] as const;
export const ActivityKindSchema = z.enum(ACTIVITY_KINDS);
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

/** Events shown per request. */
export const ACTIVITY_LIMIT = 10;

export const ActivityQuerySchema = z.object({
  scope: CommunityScopeSchema.default('specialty'),
});
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;

export const ActivityItemSchema = z.object({
  id: z.uuid(),
  kind: ActivityKindSchema,
  at: z.iso.datetime({ offset: true }),
  person: DashboardPersonSchema,
  certification: z.object({ code: z.string(), slug: SlugSchema }).nullable(),
  /** chapters_done: how many chapters that day. */
  count: z.number().int().positive().nullable(),
  /** level_reached: the rank reached. */
  level: LevelRankSchema.nullable(),
  /** badge_earned. */
  badge: BadgeKeySchema.nullable(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const ActivityFeedSchema = z.object({ items: z.array(ActivityItemSchema) });
export type ActivityFeed = z.infer<typeof ActivityFeedSchema>;
