import { z } from 'zod';
import {
  CertificationLevelSchema,
  SlugSchema,
  SpecialtyCodeSchema,
  SpecialtySchema,
} from './catalog.js';

/** ING-1 and ING-2 are the preparatory cycle, ING-3 the common core, ING-4/5 the specialty years. */
export const YEARS = [1, 2, 3, 4, 5] as const;
export const YearSchema = z.literal(YEARS);
export type Year = z.infer<typeof YearSchema>;

/** Years in which a student belongs to a specialty (the class code includes it). */
export const SPECIALTY_YEARS = [4, 5] as const;
export const COMMON_CORE_YEARS = [1, 2, 3] as const;

export function isSpecialtyYear(year: Year): year is (typeof SPECIALTY_YEARS)[number] {
  return year >= 4;
}

/** Groups match the seeded class codes (ING-2-B, ING-4-CIM-C). */
export const GROUPS = ['A', 'B', 'C', 'D'] as const;
export const GroupSchema = z.enum(GROUPS);
export type Group = z.infer<typeof GroupSchema>;

/** The onboarding steps; `result` is the recommended path screen after step 4. */
export const ONBOARDING_STEP = {
  year: 1,
  enrolment: 2,
  certifications: 3,
  photo: 4,
  result: 5,
} as const;
export const OnboardingStepSchema = z.number().int().min(1).max(5);

/**
 * Step 2. ING-4/5 students pick their specialty; ING-1…3 students pick the one they are aiming
 * for, or null when they haven't decided (they get the Fundamentals path).
 */
export const EnrolmentSchema = z.discriminatedUnion('year', [
  z.object({
    year: z.literal(SPECIALTY_YEARS),
    specialty: SpecialtyCodeSchema,
    group: GroupSchema,
  }),
  z.object({
    year: z.literal(COMMON_CORE_YEARS),
    targetSpecialty: SpecialtyCodeSchema.nullable(),
    group: GroupSchema,
  }),
]);
export type EnrolmentInput = z.infer<typeof EnrolmentSchema>;

/** The seeded class an enrolment belongs to: ING-4-CIM-C or ING-2-B. */
export function classCodeFor(enrolment: EnrolmentInput): string {
  return 'specialty' in enrolment
    ? `ING-${enrolment.year}-${enrolment.specialty}-${enrolment.group}`
    : `ING-${enrolment.year}-${enrolment.group}`;
}

/** Step 3: the certifications the student already holds, by catalog slug. */
export const CertificationPicksSchema = z.object({
  slugs: z
    .array(SlugSchema)
    .max(100)
    .transform((slugs) => [...new Set(slugs)]),
});
export type CertificationPicksInput = z.input<typeof CertificationPicksSchema>;

/** Step 4. Profiles are always visible; only leaderboards are opt-out. */
export const PrivacySchema = z.object({ leaderboardVisible: z.boolean() });
export type PrivacyInput = z.infer<typeof PrivacySchema>;

export const SpecialtyOptionSchema = SpecialtySchema.extend({
  /** Certification codes along the first track of the specialty's path. */
  pathPreview: z.array(z.string()),
});
export type SpecialtyOption = z.infer<typeof SpecialtyOptionSchema>;

export const SavedEnrolmentSchema = z.object({
  year: YearSchema,
  group: GroupSchema,
  specialty: SpecialtyCodeSchema.nullable(),
  targetSpecialty: SpecialtyCodeSchema.nullable(),
  classCode: z.string(),
  /** Students on TekCert in the same class, the student included. */
  classmates: z.number().int().nonnegative(),
});
export type SavedEnrolment = z.infer<typeof SavedEnrolmentSchema>;

export const OnboardingStateSchema = z.object({
  /** The furthest step reached: the wizard resumes here. */
  step: OnboardingStepSchema,
  completed: z.boolean(),
  firstName: z.string(),
  lastName: z.string(),
  enrolment: SavedEnrolmentSchema.nullable(),
  certificationSlugs: z.array(SlugSchema),
  leaderboardVisible: z.boolean(),
  avatarPath: z.string().nullable(),
  specialties: z.array(SpecialtyOptionSchema),
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

/**
 * - held: the student declared it (unverified until Release 2)
 * - next: the first certification on the track they don't hold yet
 * - locked: its prerequisite isn't held
 */
export const PATH_NODE_STATES = ['held', 'next', 'available', 'locked'] as const;
export const PathNodeStateSchema = z.enum(PATH_NODE_STATES);
export type PathNodeState = z.infer<typeof PathNodeStateSchema>;

export const RECOMMENDATION_REASONS = ['specialty', 'target', 'undecided'] as const;

export const RecommendedPathSchema = z.object({
  path: z.object({
    code: z.string(),
    name: z.string(),
    /** Specialty hue; null for the shared Fundamentals path. */
    hue: z.number().int().min(0).max(360).nullable(),
  }),
  reason: z.enum(RECOMMENDATION_REASONS),
  track: z.array(
    z.object({
      code: z.string(),
      slug: SlugSchema,
      name: z.string(),
      level: CertificationLevelSchema,
      state: PathNodeStateSchema,
    }),
  ),
  /** Every certification on the path, not only the track shown. */
  certificationCount: z.number().int().nonnegative(),
  peers: z.object({
    /** Other onboarded students recommended the same path. */
    count: z.number().int().nonnegative(),
    initials: z.array(z.string()).max(3),
  }),
});
export type RecommendedPath = z.infer<typeof RecommendedPathSchema>;

/** Profile photos: JPEG or PNG up to 5 MB, stored as a 512×512 WebP. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
export const AVATAR_SIZE = 512;

export const AvatarSchema = z.object({ avatarPath: z.string().nullable() });
export type Avatar = z.infer<typeof AvatarSchema>;

export const ONBOARDING_PROBLEM = {
  enrolmentRequired: 'urn:tekcert:problem:enrolment-required',
  unknownClass: 'urn:tekcert:problem:unknown-class',
  unknownCertification: 'urn:tekcert:problem:unknown-certification',
  invalidImage: 'urn:tekcert:problem:invalid-image',
} as const;
