import { describe, expect, it } from 'vitest';
import { barWidth, countLabel, PublicStatsSchema } from './landing.js';

describe('countLabel', () => {
  it('agrees with the number', () => {
    expect(countLabel(1, 'student')).toBe('1 student');
    expect(countLabel(0, 'student')).toBe('0 students');
    expect(countLabel(1386, 'student')).toBe('1,386 students');
    expect(countLabel(2, 'class', 'classes')).toBe('2 classes');
  });
});

describe('barWidth', () => {
  it('is the share of the longest bar', () => {
    expect(barWidth(38, 38)).toBe(100);
    expect(barWidth(19, 38)).toBe(50);
  });

  it('keeps a sliver for a small count and nothing for zero', () => {
    expect(barWidth(1, 400)).toBe(4);
    expect(barWidth(0, 400)).toBe(0);
    expect(barWidth(0, 0)).toBe(0);
  });
});

describe('PublicStatsSchema', () => {
  const stats = {
    certifications: 56,
    providers: 10,
    students: 61,
    preparing: 40,
    bySpecialty: [
      { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225, preparing: 12 },
    ],
    paths: [
      {
        code: 'FOND',
        name: 'Fundamentals',
        hue: null,
        certifications: 7,
        track: ['CLF-C02', 'AZ-900'],
        students: 5,
      },
    ],
  };

  it('accepts totals', () => {
    expect(PublicStatsSchema.parse(stats)).toEqual(stats);
  });

  it('refuses negative or fractional counts', () => {
    expect(PublicStatsSchema.safeParse({ ...stats, students: -1 }).success).toBe(false);
    expect(PublicStatsSchema.safeParse({ ...stats, preparing: 1.5 }).success).toBe(false);
  });

  it('drops anything that is not a total, such as a student list', () => {
    const parsed = PublicStatsSchema.parse({ ...stats, recent: [{ firstName: 'Ons' }] });
    expect(parsed).not.toHaveProperty('recent');
  });
});
