import { describe, expect, it } from 'vitest';
import { CertificationListQuerySchema, SlugSchema } from './catalog.js';
import { CommunityQuerySchema } from './community.js';

describe('SlugSchema', () => {
  it.each(['saa-c03', 'pcpp-32-1-2', 'az-900'])('accepts %s', (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(['SAA-C03', 'pcpp/32', '-az', 'az--900', ''])('rejects %s', (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('CertificationListQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(CertificationListQuerySchema.parse({})).toEqual({});
  });

  it('rejects an unknown level', () => {
    expect(CertificationListQuerySchema.safeParse({ level: 'master' }).success).toBe(false);
    expect(CertificationListQuerySchema.safeParse({ level: 'associate,master' }).success).toBe(
      false,
    );
  });

  it('splits comma lists and uppercases providers', () => {
    expect(
      CertificationListQuerySchema.parse({
        provider: 'aws, azure',
        level: 'associate,expert',
        maxDifficulty: '3',
      }),
    ).toEqual({ provider: ['AWS', 'AZURE'], level: ['associate', 'expert'], maxDifficulty: 3 });
  });

  it('rejects a difficulty outside 1–5', () => {
    expect(CertificationListQuerySchema.safeParse({ maxDifficulty: '6' }).success).toBe(false);
  });
});

describe('CommunityQuerySchema', () => {
  it('defaults to the whole institute and coerces the year', () => {
    expect(CommunityQuerySchema.parse({ year: '4', specialty: 'none' })).toEqual({
      scope: 'institute',
      year: 4,
      specialty: 'none',
    });
  });

  it('rejects an unknown year or scope', () => {
    expect(CommunityQuerySchema.safeParse({ year: '6' }).success).toBe(false);
    expect(CommunityQuerySchema.safeParse({ scope: 'world' }).success).toBe(false);
  });
});
