import { describe, expect, it } from 'vitest';
import { DirectoryQuerySchema, levelBadgeFor, UpdateMyProfileSchema } from './directory.js';
import { levelFor } from './progress.js';

describe('DirectoryQuerySchema', () => {
  it('defaults to my specialty, first page', () => {
    expect(DirectoryQuerySchema.parse({})).toEqual({ scope: 'specialty', page: 1 });
  });

  it('reads the filters from a query string', () => {
    expect(
      DirectoryQuerySchema.parse({
        scope: 'institute',
        q: '  rania ',
        holds: 'saa-c03',
        help: 'true',
        specialty: 'none',
        page: '3',
      }),
    ).toEqual({
      scope: 'institute',
      q: 'rania',
      holds: 'saa-c03',
      help: true,
      specialty: 'none',
      page: 3,
    });
    expect(DirectoryQuerySchema.parse({ help: 'false' }).help).toBe(false);
  });

  it.each([
    ['a one-letter search', { q: 'a' }],
    ['a search that is only spaces', { q: '   ' }],
    ['a search over 60 characters', { q: 'x'.repeat(61) }],
    ['an unknown scope', { scope: 'world' }],
    ['a slug with capitals', { holds: 'SAA-C03' }],
    ['page zero', { page: '0' }],
    ['a help flag that is not a boolean', { help: 'yes' }],
    ['an unknown specialty', { specialty: 'XYZ' }],
  ])('rejects %s', (_, query) => {
    expect(DirectoryQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('levelBadgeFor', () => {
  it.each([0, 249, 250, 999, 1000, 2500, 5000, 12000])('agrees with levelFor at %i', (points) => {
    const { rank, roman, name } = levelFor(points);
    expect(levelBadgeFor(points)).toEqual({ rank, roman, name });
  });
});

describe('UpdateMyProfileSchema', () => {
  it('needs a boolean', () => {
    expect(UpdateMyProfileSchema.safeParse({ availableToHelp: true }).success).toBe(true);
    expect(UpdateMyProfileSchema.safeParse({ availableToHelp: 'yes' }).success).toBe(false);
    expect(UpdateMyProfileSchema.safeParse({}).success).toBe(false);
  });
});
