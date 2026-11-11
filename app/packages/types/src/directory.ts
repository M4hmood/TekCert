import { z } from 'zod';
import { ProviderSchema, SlugSchema, SpecialtyCodeSchema, SpecialtySchema } from './catalog.js';
import { CommunityScopeSchema, CommunitySpecialtyFilterSchema } from './community.js';
import { YearSchema } from './onboarding.js';
import {
  ActivityItemSchema,
  BadgeStateSchema,
  LEVEL_NAMES,
  LevelRankSchema,
  LEVELS,
} from './progress.js';

/** Students per page of the directory. */
export const DIRECTORY_PAGE_SIZE = 24;
/** Certification chips on a directory card: held first, then in progress. */
export const DIRECTORY_HELD_CHIPS = 3;
export const DIRECTORY_PREPARING_CHIPS = 1;
export const DIRECTORY_SEARCH_MIN = 2;
export const DIRECTORY_SEARCH_MAX = 60;

export const DirectoryQuerySchema = z.object({
  scope: CommunityScopeSchema.default('specialty'),
  /** Matches a name, or the code or name of a certification the student holds or prepares. */
  q: z.string().trim().min(DIRECTORY_SEARCH_MIN).max(DIRECTORY_SEARCH_MAX).optional(),
  /** Only students who hold this certification. */
  holds: SlugSchema.optional(),
  /** `true`: only students available to help. */
  help: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  specialty: CommunitySpecialtyFilterSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type DirectoryQuery = z.infer<typeof DirectoryQuerySchema>;

/** A level without the points behind it: safe to show for any student. */
export const LevelBadgeSchema = z.object({
  rank: LevelRankSchema,
  roman: z.string(),
  name: z.enum(LEVEL_NAMES),
});
export type LevelBadge = z.infer<typeof LevelBadgeSchema>;

export function levelBadgeFor(points: number): LevelBadge {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const level of LEVELS) if (points >= level.min) current = level;
  return { rank: current.rank, roman: current.roman, name: current.name };
}

const CertificationChipSchema = z.object({ code: z.string(), slug: SlugSchema });

export const DirectoryPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarPath: z.string().nullable(),
  classCode: z.string(),
  year: YearSchema,
  /** The class specialty (ING-4/5); null in ING-1 to 3. */
  specialty: SpecialtyCodeSchema.nullable(),
  availableToHelp: z.boolean(),
  /** The student asking is listed too, first. */
  isMe: z.boolean(),
  /** The first few certifications held, oldest first. */
  held: z.array(CertificationChipSchema).max(DIRECTORY_HELD_CHIPS),
  preparing: z.array(CertificationChipSchema).max(DIRECTORY_PREPARING_CHIPS),
  earnedCount: z.number().int().nonnegative(),
  preparingCount: z.number().int().nonnegative(),
  level: LevelBadgeSchema,
  /** Null for a student who hides their name on the leaderboard (except to themselves). */
  points: z.number().int().nonnegative().nullable(),
});
export type DirectoryPerson = z.infer<typeof DirectoryPersonSchema>;

export const DirectorySchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  items: z.array(DirectoryPersonSchema),
  /** Students per class specialty with every filter applied except the specialty one. */
  specialties: z.array(
    z.object({
      code: CommunitySpecialtyFilterSchema,
      count: z.number().int().positive(),
    }),
  ),
  /** Whose scopes these are: the labels read "My class · ING-4-CIM-A". */
  viewer: z.object({
    classCode: z.string().nullable(),
    year: YearSchema.nullable(),
    /** Class specialty, or the one aimed for in ING-1 to 3. */
    specialty: SpecialtyCodeSchema.nullable(),
  }),
});
export type Directory = z.infer<typeof DirectorySchema>;

export const StudentParamsSchema = z.object({ id: z.uuid() });

const ProfileCertificationSchema = z.object({
  slug: SlugSchema,
  code: z.string(),
  name: z.string(),
  provider: ProviderSchema,
  badgeAsset: z.string().nullable(),
});

export const ProfileHeldSchema = ProfileCertificationSchema.extend({
  /** Release 1: declared at onboarding, never verified. */
  status: z.literal('unverified'),
  since: z.iso.datetime({ offset: true }),
});
export type ProfileHeld = z.infer<typeof ProfileHeldSchema>;

export const ProfilePreparingSchema = ProfileCertificationSchema.extend({
  pct: z.number().int().min(0).max(100),
  /** Chapter counts on my own profile only; other students see the percentage. */
  done: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative().nullable(),
});
export type ProfilePreparing = z.infer<typeof ProfilePreparingSchema>;

export const ProfilePathSchema = z.object({
  /** CIM, SSIR… or FOND for the Fundamentals path. */
  code: z.string(),
  name: z.string(),
  kind: z.enum(['specialty', 'target', 'fundamentals']),
  heldCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type ProfilePath = z.infer<typeof ProfilePathSchema>;

/** A line of the student's own recent activity: the feed's shape without the person. */
export const ProfileActivitySchema = ActivityItemSchema.omit({ person: true });
export type ProfileActivity = z.infer<typeof ProfileActivitySchema>;

export const PROFILE_ACTIVITY_LIMIT = 5;

/** A student as signed-in students see them. Every profile is visible (2026-10-29). */
export const StudentProfileSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarPath: z.string().nullable(),
  classCode: z.string(),
  year: YearSchema,
  specialty: SpecialtySchema.nullable(),
  /** ING-1 to 3: the specialty aimed for. */
  targetSpecialty: SpecialtySchema.nullable(),
  email: z.email(),
  availableToHelp: z.boolean(),
  isMe: z.boolean(),
  level: LevelBadgeSchema,
  /** Null for a student who hides their name on the leaderboard (except to themselves). */
  points: z.number().int().nonnegative().nullable(),
  stats: z.object({
    unverified: z.number().int().nonnegative(),
    preparing: z.number().int().nonnegative(),
    /** Hidden together with the points: in Release 1 one gives the other. */
    chaptersDone: z.number().int().nonnegative().nullable(),
    badges: z.number().int().nonnegative(),
  }),
  collection: z.array(ProfileHeldSchema),
  preparing: z.array(ProfilePreparingSchema),
  path: ProfilePathSchema.nullable(),
  /** All five, in BADGE_KEYS order. */
  badges: z.array(BadgeStateSchema),
  activity: z.array(ProfileActivitySchema).max(PROFILE_ACTIVITY_LIMIT),
  /** My own profile only. */
  privacy: z.object({ leaderboardVisible: z.boolean() }).nullable(),
});
export type StudentProfile = z.infer<typeof StudentProfileSchema>;

export const UpdateMyProfileSchema = z.object({ availableToHelp: z.boolean() });
export type UpdateMyProfileInput = z.infer<typeof UpdateMyProfileSchema>;

export const MyProfileSettingsSchema = z.object({ availableToHelp: z.boolean() });
export type MyProfileSettings = z.infer<typeof MyProfileSettingsSchema>;
