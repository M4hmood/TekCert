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
  /** Students who hold it. In Release 1 they are all unverified (declared at onboarding). */
  earnedCount: z.number().int().nonnegative(),
});
export type CertificationSummary = z.infer<typeof CertificationSummarySchema>;

export const CATALOG_SORTS = ['earned', 'name', 'difficulty', 'level'] as const;
export const CatalogSortSchema = z.enum(CATALOG_SORTS);
export type CatalogSort = z.infer<typeof CatalogSortSchema>;

/** Provider codes are uppercase in the database; the query accepts any case. */
const ProviderCodeSchema = z
  .string()
  .regex(/^[A-Za-z]{1,16}$/)
  .transform((code) => code.toUpperCase());

/** `a,b,c` in a query string → a list, at most 20 values. */
const commaList = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .string()
    .max(400)
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item).max(20));

/** Catalog search and filters, as the API and the /catalog URL take them. */
export const CertificationListQuerySchema = z.object({
  /** Matches the code, the name or the exam code. */
  q: z.string().trim().max(80).optional(),
  provider: commaList(ProviderCodeSchema).optional(),
  level: commaList(CertificationLevelSchema).optional(),
  specialty: commaList(SpecialtyCodeSchema).optional(),
  maxDifficulty: z.coerce.number().int().min(1).max(5).optional(),
  sort: CatalogSortSchema.optional(),
});
export type CertificationListQuery = z.infer<typeof CertificationListQuerySchema>;

/** Counts per option, each computed with every other filter applied. */
export const CatalogFacetsSchema = z.object({
  provider: z.record(z.string(), z.number().int().nonnegative()),
  level: z.record(z.string(), z.number().int().nonnegative()),
  specialty: z.record(z.string(), z.number().int().nonnegative()),
});
export type CatalogFacets = z.infer<typeof CatalogFacetsSchema>;

export const CertificationListSchema = z.object({
  items: z.array(CertificationSummarySchema),
  total: z.number().int().nonnegative(),
  facets: CatalogFacetsSchema,
});
export type CertificationList = z.infer<typeof CertificationListSchema>;

export const ChapterSchema = z.object({
  /** Stable across seed runs while the chapter keeps its place; students tick chapters by id. */
  id: z.uuid(),
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

export const RESOURCE_KINDS = ['doc', 'video', 'lab', 'practice'] as const;
export const ResourceKindSchema = z.enum(RESOURCE_KINDS);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

/** An external link: TekCert hosts no courses. */
export const CertificationResourceSchema = z.object({
  kind: ResourceKindSchema,
  title: z.string(),
  url: z.url({ protocol: /^https$/ }),
  /** Host shown on the card, e.g. "docs.aws.amazon.com". */
  source: z.string(),
  /** Rough time to go through it, e.g. "3 h". */
  duration: z.string().nullable(),
});
export type CertificationResource = z.infer<typeof CertificationResourceSchema>;

/** Exam facts; null when the vendor doesn't publish them. */
export const ExamFactsSchema = z.object({
  minutes: z.number().int().positive().nullable(),
  questions: z.number().int().positive().nullable(),
  passingScore: z.string().nullable(),
  languages: z.string().nullable(),
  delivery: z.string().nullable(),
  validityYears: z.number().int().positive().nullable(),
});
export type ExamFacts = z.infer<typeof ExamFactsSchema>;

export const CertificationRefSchema = z.object({
  code: z.string(),
  slug: SlugSchema,
  name: z.string(),
});
export type CertificationRef = z.infer<typeof CertificationRefSchema>;

export const CertificationDetailSchema = CertificationSummarySchema.extend({
  /** One or two sentences under the title. */
  summary: z.string(),
  /** Longer text for the Overview tab; the summary stands in when null. */
  description: z.string().nullable(),
  facts: ExamFactsSchema,
  domains: z.array(CertificationDomainSchema),
  resources: z.array(CertificationResourceSchema),
  /** Recommended first: prerequisites of this certification on any path. */
  prerequisites: z.array(CertificationRefSchema),
  preparingCount: z.number().int().nonnegative(),
});
export type CertificationDetail = z.infer<typeof CertificationDetailSchema>;
