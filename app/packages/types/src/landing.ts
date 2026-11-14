import { z } from 'zod';
import { SpecialtySchema } from './catalog.js';

/** How long the public numbers may be reused, in seconds: the API caches them this long too. */
export const PUBLIC_STATS_MAX_AGE = 300;
/** Certification codes shown along a path card on the landing page. */
export const LANDING_TRACK_LENGTH = 3;

const count = z.number().int().nonnegative();

/**
 * What the public landing page may show: totals only. Nothing here says anything about one
 * student (every profile is for signed-in students, decision of 2026-10-29).
 */
export const PublicStatsSchema = z.object({
  /** Active certifications in the catalog, and the providers behind them. */
  certifications: count,
  providers: count,
  /** Students with a verified address who finished onboarding and are still at TEK-UP. */
  students: count,
  /** Those among them preparing at least one certification. */
  preparing: count,
  /** The six specialties in design order, ING-1 to 3 counting for the one they aim for. */
  bySpecialty: z.array(SpecialtySchema.extend({ preparing: count })),
  /** Fundamentals first, then one path per specialty. */
  paths: z.array(
    z.object({
      /** FOND, or the specialty code. */
      code: z.string(),
      name: z.string(),
      /** Null for the shared Fundamentals path. */
      hue: z.number().int().min(0).max(360).nullable(),
      certifications: count,
      /** The first certifications of the path's main track, by code. */
      track: z.array(z.string()).max(LANDING_TRACK_LENGTH + 2),
      /** Students whose path it is. */
      students: count,
    }),
  ),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;

/** "1 student", "386 students". */
export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`;
}

/** The share of the longest bar, 0 to 100; a count above zero always shows a sliver. */
export function barWidth(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}
