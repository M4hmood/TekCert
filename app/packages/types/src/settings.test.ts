import { describe, expect, it } from 'vitest';
import {
  AcademicYearAnswerSchema,
  academicYearLabel,
  academicYearOf,
  csvCell,
  isYearPromptDue,
  nextEnrolment,
  toCsv,
  UpdateAccountSchema,
} from './settings.js';

const at = (iso: string) => new Date(iso);

describe('academicYearOf', () => {
  it('changes on 1 September in Tunis', () => {
    expect(academicYearOf(at('2026-11-13T10:00:00Z'))).toBe(2026);
    expect(academicYearOf(at('2027-08-31T22:30:00Z'))).toBe(2026);
    // 23:00 UTC on 31 August is midnight on 1 September in Tunis.
    expect(academicYearOf(at('2027-08-31T23:00:00Z'))).toBe(2027);
  });

  it('is labelled with both years', () => {
    expect(academicYearLabel(2026)).toBe('2026-27');
    expect(academicYearLabel(2099)).toBe('2099-00');
  });
});

describe('isYearPromptDue', () => {
  const student = { confirmedYear: 2026, alumni: false, onboarded: true };

  it('is due from 1 September until the student answers', () => {
    expect(isYearPromptDue(student, at('2027-08-31T12:00:00Z'))).toBe(false);
    expect(isYearPromptDue(student, at('2027-09-01T12:00:00Z'))).toBe(true);
    expect(isYearPromptDue({ ...student, confirmedYear: 2027 }, at('2027-09-01T12:00:00Z'))).toBe(
      false,
    );
  });

  it('asks a student who never confirmed a year', () => {
    expect(isYearPromptDue({ ...student, confirmedYear: null }, at('2026-11-13T10:00:00Z'))).toBe(
      true,
    );
  });

  it('never asks alumni or students still in onboarding', () => {
    const september = at('2027-09-15T12:00:00Z');
    expect(isYearPromptDue({ ...student, alumni: true }, september)).toBe(false);
    expect(isYearPromptDue({ ...student, onboarded: false }, september)).toBe(false);
  });
});

describe('nextEnrolment', () => {
  it('keeps the target specialty through the common core', () => {
    expect(
      nextEnrolment(
        { year: 1, group: 'A', specialty: null, targetSpecialty: 'CIM' },
        { group: 'B' },
      ),
    ).toEqual({ ok: true, enrolment: { year: 2, targetSpecialty: 'CIM', group: 'B' } });
  });

  it('asks for a specialty when moving up to ING-4, the target being the default', () => {
    const ing3 = { year: 3 as const, group: 'A' as const, specialty: null };
    expect(nextEnrolment({ ...ing3, targetSpecialty: null }, { group: 'A' })).toEqual({
      ok: false,
      reason: 'specialty_required',
    });
    expect(nextEnrolment({ ...ing3, targetSpecialty: 'SSIR' }, { group: 'C' })).toEqual({
      ok: true,
      enrolment: { year: 4, specialty: 'SSIR', group: 'C' },
    });
    expect(
      nextEnrolment({ ...ing3, targetSpecialty: 'SSIR' }, { group: 'C', specialty: 'CIM' }),
    ).toEqual({ ok: true, enrolment: { year: 4, specialty: 'CIM', group: 'C' } });
  });

  it('keeps the specialty from ING-4 to ING-5', () => {
    expect(
      nextEnrolment(
        { year: 4, group: 'A', specialty: 'CIM', targetSpecialty: null },
        { group: 'A' },
      ),
    ).toEqual({ ok: true, enrolment: { year: 5, specialty: 'CIM', group: 'A' } });
  });

  it('has nowhere to go after ING-5', () => {
    expect(
      nextEnrolment(
        { year: 5, group: 'A', specialty: 'CIM', targetSpecialty: null },
        { group: 'A' },
      ),
    ).toEqual({ ok: false, reason: 'final_year' });
  });
});

describe('AcademicYearAnswerSchema', () => {
  it('needs a group to move up, and nothing else to repeat or leave', () => {
    expect(AcademicYearAnswerSchema.safeParse({ status: 'moving_up' }).success).toBe(false);
    expect(AcademicYearAnswerSchema.safeParse({ status: 'moving_up', group: 'B' }).success).toBe(
      true,
    );
    expect(AcademicYearAnswerSchema.safeParse({ status: 'repeating' }).success).toBe(true);
    expect(AcademicYearAnswerSchema.safeParse({ status: 'left' }).success).toBe(true);
    expect(AcademicYearAnswerSchema.safeParse({ status: 'paused' }).success).toBe(false);
  });
});

describe('UpdateAccountSchema', () => {
  it('trims names and refuses empty ones', () => {
    expect(UpdateAccountSchema.parse({ firstName: ' Yassine ', lastName: 'Ben Amor' })).toEqual({
      firstName: 'Yassine',
      lastName: 'Ben Amor',
    });
    expect(UpdateAccountSchema.safeParse({ firstName: '  ', lastName: 'Ben Amor' }).success).toBe(
      false,
    );
  });
});

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('AWS Solutions Architect')).toBe('AWS Solutions Architect');
    expect(csvCell('Storage, compute')).toBe('"Storage, compute"');
    expect(csvCell('The "shared" model')).toBe('"The ""shared"" model"');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('stops a spreadsheet from running a cell as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@sum')).toBe("'@sum");
  });

  it('writes numbers as they are and nothing for a missing value', () => {
    expect(csvCell(-10)).toBe('-10');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('starts with a BOM and ends each row with CRLF', () => {
    expect(
      toCsv([
        ['record', 'points'],
        ['points', 10],
      ]),
    ).toBe('\uFEFFrecord,points\r\npoints,10\r\n');
  });
});
