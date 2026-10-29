import { describe, expect, it } from 'vitest';
import {
  CertificationPicksSchema,
  classCodeFor,
  EnrolmentSchema,
  isSpecialtyYear,
} from './onboarding.js';

describe('EnrolmentSchema', () => {
  it('needs a specialty in ING-4 and ING-5', () => {
    expect(EnrolmentSchema.parse({ year: 4, specialty: 'CIM', group: 'C' })).toEqual({
      year: 4,
      specialty: 'CIM',
      group: 'C',
    });
    expect(EnrolmentSchema.safeParse({ year: 5, group: 'A' }).success).toBe(false);
    expect(EnrolmentSchema.safeParse({ year: 4, targetSpecialty: 'CIM', group: 'A' }).success).toBe(
      false,
    );
  });

  it('accepts a target specialty or "undecided" in ING-1…3', () => {
    expect(EnrolmentSchema.parse({ year: 3, targetSpecialty: 'SSIR', group: 'B' })).toMatchObject({
      targetSpecialty: 'SSIR',
    });
    expect(EnrolmentSchema.parse({ year: 1, targetSpecialty: null, group: 'D' })).toMatchObject({
      targetSpecialty: null,
    });
    expect(EnrolmentSchema.safeParse({ year: 2, specialty: 'CIM', group: 'A' }).success).toBe(
      false,
    );
  });

  it.each([
    { year: 6, specialty: 'CIM', group: 'A' },
    { year: 4, specialty: 'XYZ', group: 'A' },
    { year: 4, specialty: 'CIM', group: 'E' },
    { year: '4', specialty: 'CIM', group: 'A' },
  ])('rejects %o', (input) => {
    expect(EnrolmentSchema.safeParse(input).success).toBe(false);
  });
});

describe('classCodeFor', () => {
  it('follows the institute pattern', () => {
    expect(classCodeFor({ year: 4, specialty: 'CIM', group: 'C' })).toBe('ING-4-CIM-C');
    expect(classCodeFor({ year: 2, targetSpecialty: 'SDIA', group: 'B' })).toBe('ING-2-B');
  });
});

describe('isSpecialtyYear', () => {
  it('is true from ING-4', () => {
    expect([1, 2, 3, 4, 5].map((y) => isSpecialtyYear(y as 1))).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});

describe('CertificationPicksSchema', () => {
  it('removes duplicates', () => {
    expect(CertificationPicksSchema.parse({ slugs: ['clf-c02', 'clf-c02', 'az-900'] })).toEqual({
      slugs: ['clf-c02', 'az-900'],
    });
  });

  it('rejects invalid slugs', () => {
    expect(CertificationPicksSchema.safeParse({ slugs: ['CLF C02'] }).success).toBe(false);
  });
});
