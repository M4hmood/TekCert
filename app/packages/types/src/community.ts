import { z } from 'zod';
import { SlugSchema, SpecialtyCodeSchema } from './catalog.js';
import { YearSchema } from './onboarding.js';

/** A student's relationship to one certification. Release 2 adds pending / verified. */
export const MY_CERTIFICATION_STATUSES = ['unverified', 'in_progress'] as const;
export const MyCertificationStatusSchema = z.enum(MY_CERTIFICATION_STATUSES);
export type MyCertificationStatus = z.infer<typeof MyCertificationStatusSchema>;

export const MyCertificationSchema = z.object({
  slug: SlugSchema,
  status: MyCertificationStatusSchema,
  /** When it was declared (unverified) or started (in progress). */
  since: z.iso.datetime({ offset: true }),
});
export type MyCertification = z.infer<typeof MyCertificationSchema>;

export const MyCertificationsSchema = z.object({ items: z.array(MyCertificationSchema) });
export type MyCertifications = z.infer<typeof MyCertificationsSchema>;

/** "Who to ask": whose certifications to list, relative to the student asking. */
export const COMMUNITY_SCOPES = ['class', 'specialty', 'year', 'institute'] as const;
export const CommunityScopeSchema = z.enum(COMMUNITY_SCOPES);
export type CommunityScope = z.infer<typeof CommunityScopeSchema>;

/** `none` = students without a specialty yet (ING-1 to 3). */
export const CommunitySpecialtyFilterSchema = z.union([SpecialtyCodeSchema, z.literal('none')]);
export type CommunitySpecialtyFilter = z.infer<typeof CommunitySpecialtyFilterSchema>;

export const CommunityQuerySchema = z.object({
  scope: CommunityScopeSchema.default('institute'),
  specialty: CommunitySpecialtyFilterSchema.optional(),
  year: z.coerce.number().pipe(YearSchema).optional(),
});
export type CommunityQuery = z.infer<typeof CommunityQuerySchema>;

/** Each list shows at most this many people; `total` counts them all. */
export const COMMUNITY_LIST_LIMIT = 50;

/** What one student sees of another. Every profile is visible to signed-in students (2026-10-29). */
export const CommunityPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarPath: z.string().nullable(),
  classCode: z.string(),
  year: YearSchema,
  /** The class specialty (ING-4/5); null in ING-1 to 3. */
  specialty: SpecialtyCodeSchema.nullable(),
  email: z.email(),
  /** Declared (Earned it) or started (Preparing it). */
  since: z.iso.datetime({ offset: true }),
  /** Preparing it: share of the syllabus done. Never which chapters. Null under Earned it. */
  pct: z.number().int().min(0).max(100).nullable(),
});
export type CommunityPerson = z.infer<typeof CommunityPersonSchema>;

export const CommunityListSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(CommunityPersonSchema),
});
export type CommunityList = z.infer<typeof CommunityListSchema>;

export const CertificationCommunitySchema = z.object({
  earned: CommunityListSchema,
  preparing: CommunityListSchema,
});
export type CertificationCommunity = z.infer<typeof CertificationCommunitySchema>;

export const CERTIFICATION_PROBLEM = {
  alreadyHeld: 'urn:tekcert:problem:certification-already-held',
} as const;
