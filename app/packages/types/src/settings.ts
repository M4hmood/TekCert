import { z } from 'zod';
import { NameSchema, ThemeSchema } from './auth.js';
import { type SpecialtyCode, SpecialtyCodeSchema, SpecialtySchema } from './catalog.js';
import { MyProfileSettingsSchema } from './directory.js';
import { semesterOf } from './leaderboard.js';
import {
  type EnrolmentInput,
  type Group,
  GroupSchema,
  SavedEnrolmentSchema,
  type Year,
} from './onboarding.js';

/** The academic year a date falls in, named by the year it starts: 2026 for 2026-27. */
export function academicYearOf(now: Date): number {
  return semesterOf(now).academicYear;
}

/** "2026-27". */
export function academicYearLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

/**
 * The year prompt is due from 1 September (Tunis time) until the student says where they are.
 * Alumni and students still in onboarding are never asked.
 */
export function isYearPromptDue(
  student: { confirmedYear: number | null; alumni: boolean; onboarded: boolean },
  now: Date,
): boolean {
  if (student.alumni || !student.onboarded) return false;
  return (student.confirmedYear ?? 0) < academicYearOf(now);
}

export const SettingsSchema = z.object({
  account: z.object({ firstName: z.string(), lastName: z.string(), email: z.email() }),
  /** Null only before onboarding saved a class. */
  enrolment: SavedEnrolmentSchema.nullable(),
  /** Said they left TEK-UP; `enrolment` is then their last class. */
  alumni: z.boolean(),
  privacy: MyProfileSettingsSchema,
  /** Null until the student chooses one: the browser's own setting then applies. */
  theme: ThemeSchema.nullable(),
  academicYear: z.object({
    /** The year the current academic year started in. */
    year: z.number().int(),
    /** "2026-27". */
    label: z.string(),
    /** True while the student still has to say where they are this year. */
    due: z.boolean(),
  }),
  /** The specialties, in design order, for the pickers. */
  specialties: z.array(SpecialtySchema),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const UpdateAccountSchema = z.object({ firstName: NameSchema, lastName: NameSchema });
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

export const UpdatePreferencesSchema = z.object({ theme: ThemeSchema });
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

export const ACADEMIC_YEAR_STATUSES = ['moving_up', 'repeating', 'left'] as const;

/** The answer to "Where are you this year?". */
export const AcademicYearAnswerSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('moving_up'),
    group: GroupSchema,
    /** Needed when moving up to ING-4; in ING-5 it defaults to last year's. */
    specialty: SpecialtyCodeSchema.optional(),
  }),
  z.object({ status: z.literal('repeating') }),
  /** Graduated or left: the profile switches to alumni mode. */
  z.object({ status: z.literal('left') }),
]);
export type AcademicYearAnswer = z.infer<typeof AcademicYearAnswerSchema>;

export interface CurrentEnrolment {
  year: Year;
  group: Group;
  specialty: SpecialtyCode | null;
  targetSpecialty: SpecialtyCode | null;
}

export type NextEnrolment =
  | { ok: true; enrolment: EnrolmentInput }
  | { ok: false; reason: 'final_year' | 'specialty_required' };

/**
 * The class a student moves up to. From ING-3 they choose a specialty (their target is the
 * default); in ING-1 and 2 the target they aim for is kept.
 */
export function nextEnrolment(
  current: CurrentEnrolment,
  answer: { group: Group; specialty?: SpecialtyCode },
): NextEnrolment {
  if (current.year >= 5) return { ok: false, reason: 'final_year' };
  const year = (current.year + 1) as Year;
  if (year >= 4) {
    const specialty = answer.specialty ?? current.specialty ?? current.targetSpecialty;
    if (!specialty) return { ok: false, reason: 'specialty_required' };
    return { ok: true, enrolment: { year: year as 4 | 5, specialty, group: answer.group } };
  }
  return {
    ok: true,
    enrolment: {
      year: year as 1 | 2 | 3,
      targetSpecialty: current.targetSpecialty,
      group: answer.group,
    },
  };
}

export const SETTINGS_PROBLEM = {
  finalYear: 'urn:tekcert:problem:final-year',
  specialtyRequired: 'urn:tekcert:problem:specialty-required',
  yearAlreadyConfirmed: 'urn:tekcert:problem:academic-year-already-confirmed',
} as const;

/**
 * One CSV cell. Quotes are doubled, and a cell that a spreadsheet would run as a formula
 * (starting with = + - @, a tab or a carriage return) is made plain text with a leading quote.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Rows joined the way spreadsheets expect: CRLF, with a BOM so Excel reads UTF-8. */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export const EXPORT_COLUMNS = ['record', 'code', 'name', 'status', 'points', 'date'] as const;
