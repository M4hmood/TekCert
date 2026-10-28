import { z } from 'zod';

export const SPECIALTY_CODES = ['SDIA', 'CIM', 'GLOps', 'SSIR', 'AIOT', 'DMWM'] as const;
export const SpecialtyCodeSchema = z.enum(SPECIALTY_CODES);
export type SpecialtyCode = z.infer<typeof SpecialtyCodeSchema>;

export const CERTIFICATION_LEVELS = [
  'foundational',
  'associate',
  'professional',
  'expert',
] as const;
export const CertificationLevelSchema = z.enum(CERTIFICATION_LEVELS);
export type CertificationLevel = z.infer<typeof CertificationLevelSchema>;

/** oklch hue (0–360) used to tint tags, avatars and path accents. */
const HueSchema = z.number().int().min(0).max(360);

/** URL-safe identifier, e.g. "saa-c03" or "pcpp-32-1-2". */
export const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase letters, digits and single dashes');

export const SpecialtySchema = z.object({
  code: SpecialtyCodeSchema,
  name: z.string(),
  hue: HueSchema,
});
export type Specialty = z.infer<typeof SpecialtySchema>;

export const ProviderSchema = z.object({
  code: z.string(),
  name: z.string(),
  hue: HueSchema,
});
export type Provider = z.infer<typeof ProviderSchema>;

export const CertificationSummarySchema = z.object({
  code: z.string(),
  slug: SlugSchema,
  name: z.string(),
  examCode: z.string().nullable(),
  level: CertificationLevelSchema,
  difficulty: z.number().int().min(1).max(5),
  provider: ProviderSchema,
  forAllSpecialties: z.boolean(),
  specialties: z.array(SpecialtyCodeSchema),
  chapterCount: z.number().int().nonnegative(),
  badgeAsset: z.string().nullable(),
});
export type CertificationSummary = z.infer<typeof CertificationSummarySchema>;

export const CertificationListSchema = z.object({
  items: z.array(CertificationSummarySchema),
  total: z.number().int().nonnegative(),
});
export type CertificationList = z.infer<typeof CertificationListSchema>;

export const CertificationListQuerySchema = z.object({
  provider: z.string().min(1).max(32).optional(),
  level: CertificationLevelSchema.optional(),
  specialty: SpecialtyCodeSchema.optional(),
});
export type CertificationListQuery = z.infer<typeof CertificationListQuerySchema>;

export const ChapterSchema = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  estimatedMinutes: z.number().int().positive(),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const CertificationDomainSchema = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  shortTitle: z.string(),
  weightPct: z.number().int().min(1).max(100).nullable(),
  chapters: z.array(ChapterSchema),
});
export type CertificationDomain = z.infer<typeof CertificationDomainSchema>;

export const CertificationDetailSchema = CertificationSummarySchema.extend({
  domains: z.array(CertificationDomainSchema),
});
export type CertificationDetail = z.infer<typeof CertificationDetailSchema>;
