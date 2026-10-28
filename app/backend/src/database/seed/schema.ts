import {
  CertificationLevelSchema,
  SlugSchema,
  SpecialtyCodeSchema,
  SPECIALTY_CODES,
} from '@tekcert/types';
import { z } from 'zod';

/** Shapes of the seed data files. Validated before anything is written to the database. */

const HueSchema = z.number().int().min(0).max(360);

export const SpecialtySeedSchema = z.object({
  code: SpecialtyCodeSchema,
  name: z.string().min(1),
  hue: HueSchema,
});

export const ProviderSeedSchema = z.object({
  code: z.string().regex(/^[A-Z]+$/),
  name: z.string().min(1),
  hue: HueSchema,
});

const ChapterSeedSchema = z.object({
  title: z.string().min(1),
  minutes: z.number().int().positive(),
  /** Explicit syllabus position; defaults to the running count across domains. */
  order: z.number().int().positive().optional(),
});

const DomainSeedSchema = z.object({
  title: z.string().min(1),
  short: z.string().min(1),
  weight: z.number().int().min(1).max(100).nullable(),
  chapters: z.array(ChapterSeedSchema).min(1),
});

export const CertificationSeedSchema = z
  .object({
    code: z.string().min(2).max(24),
    slug: SlugSchema,
    name: z.string().min(1),
    examCode: z.string().nullable(),
    provider: z.string(),
    level: CertificationLevelSchema,
    difficulty: z.number().int().min(1).max(5),
    specialties: z.union([z.literal('ALL'), z.array(SpecialtyCodeSchema).min(1)]),
    badgeAsset: z.string().nullable(),
    domains: z.array(DomainSeedSchema).min(1),
  })
  .superRefine((cert, ctx) => {
    const weights = cert.domains.map((d) => d.weight);
    if (weights.every((w) => w !== null)) {
      const sum = weights.reduce<number>((a, w) => a + (w ?? 0), 0);
      if (sum !== 100) {
        ctx.addIssue({ code: 'custom', message: `${cert.code}: domain weights sum to ${sum}` });
      }
    } else if (weights.some((w) => w !== null)) {
      ctx.addIssue({
        code: 'custom',
        message: `${cert.code}: weights must be all set or all null`,
      });
    }
    const orders = chapterOrders(cert.domains);
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({ code: 'custom', message: `${cert.code}: duplicate chapter order` });
    }
  });

export const PathSeedSchema = z.object({
  code: z.union([z.literal('FOND'), SpecialtyCodeSchema]),
  name: z.string().min(1),
  nodes: z
    .array(
      z.object({
        cert: z.string(),
        col: z.number().int().min(0).max(2),
        row: z.number().int().min(0).max(2),
        prerequisite: z.string().optional(),
      }),
    )
    .min(1),
});

export type SpecialtySeed = z.infer<typeof SpecialtySeedSchema>;
export type ProviderSeed = z.infer<typeof ProviderSeedSchema>;
export type CertificationSeed = z.infer<typeof CertificationSeedSchema>;
export type PathSeed = z.infer<typeof PathSeedSchema>;

/** Chapter positions in syllabus order: explicit `order`, else 1, 2, 3… across domains. */
export function chapterOrders(domains: z.infer<typeof DomainSeedSchema>[]): number[] {
  let next = 1;
  return domains.flatMap((d) => d.chapters.map((c) => c.order ?? next++));
}

export interface SeedData {
  specialties: SpecialtySeed[];
  providers: ProviderSeed[];
  certifications: CertificationSeed[];
  paths: PathSeed[];
  groups: string[];
}

/** Validates every file and the references between them. Throws with all problems listed. */
export function validateSeedData(data: SeedData): SeedData {
  const problems: string[] = [];
  const collect = <T>(schema: z.ZodType<T>, items: unknown[], label: string): void => {
    items.forEach((item, i) => {
      const result = schema.safeParse(item);
      if (!result.success) {
        problems.push(`${label}[${i}]: ${z.prettifyError(result.error)}`);
      }
    });
  };
  collect(SpecialtySeedSchema, data.specialties, 'specialties');
  collect(ProviderSeedSchema, data.providers, 'providers');
  collect(CertificationSeedSchema, data.certifications, 'certifications');
  collect(PathSeedSchema, data.paths, 'paths');

  const duplicates = (values: string[], label: string): void => {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) problems.push(`duplicate ${label}: ${v}`);
      seen.add(v);
    }
  };
  duplicates(
    data.specialties.map((s) => s.code),
    'specialty code',
  );
  duplicates(
    data.providers.map((p) => p.code),
    'provider code',
  );
  duplicates(
    data.certifications.map((c) => c.code),
    'certification code',
  );
  duplicates(
    data.certifications.map((c) => c.slug),
    'certification slug',
  );
  duplicates(
    data.paths.map((p) => p.code),
    'path code',
  );

  const specialtyCodes = new Set(data.specialties.map((s) => s.code));
  for (const code of SPECIALTY_CODES) {
    if (!specialtyCodes.has(code)) problems.push(`missing specialty ${code}`);
  }
  const providerCodes = new Set(data.providers.map((p) => p.code));
  const certCodes = new Set(data.certifications.map((c) => c.code));
  for (const cert of data.certifications) {
    if (!providerCodes.has(cert.provider)) {
      problems.push(`${cert.code}: unknown provider ${cert.provider}`);
    }
  }
  for (const path of data.paths) {
    if (path.code !== 'FOND' && !specialtyCodes.has(path.code)) {
      problems.push(`path ${path.code}: no matching specialty`);
    }
    const inPath = new Set(path.nodes.map((n) => n.cert));
    duplicates([...path.nodes.map((n) => n.cert)], `node in path ${path.code}`);
    duplicates(
      path.nodes.map((n) => `${n.col},${n.row}`),
      `cell in path ${path.code}`,
    );
    for (const node of path.nodes) {
      if (!certCodes.has(node.cert)) problems.push(`path ${path.code}: unknown cert ${node.cert}`);
      if (node.prerequisite && !inPath.has(node.prerequisite)) {
        problems.push(`path ${path.code}: prerequisite ${node.prerequisite} is not on the path`);
      }
    }
  }
  duplicates(data.groups, 'group');

  if (problems.length > 0) {
    throw new Error(`Invalid seed data:\n- ${problems.join('\n- ')}`);
  }
  return data;
}
