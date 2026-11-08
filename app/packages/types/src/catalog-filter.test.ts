import { describe, expect, it } from 'vitest';
import type { CertificationSummary } from './catalog.js';
import {
  activeFilterCount,
  catalogFacets,
  filterCatalog,
  paginateCatalog,
  parseCatalogPage,
  parseCatalogQuery,
  serializeCatalogQuery,
} from './catalog-filter.js';

const cert = (
  overrides: Partial<CertificationSummary> & { code: string },
): CertificationSummary => ({
  slug: overrides.code.toLowerCase(),
  name: overrides.code,
  examCode: null,
  level: 'associate',
  difficulty: 3,
  provider: { code: 'AWS', name: 'Amazon Web Services', hue: 55 },
  forAllSpecialties: false,
  specialties: ['CIM'],
  chapterCount: 5,
  badgeAsset: null,
  earnedCount: 0,
  ...overrides,
});

const azure = { code: 'AZURE', name: 'Microsoft Azure', hue: 245 };
const redHat = { code: 'REDHAT', name: 'Red Hat', hue: 25 };

const catalog = [
  cert({
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    level: 'foundational',
    difficulty: 1,
    forAllSpecialties: true,
    specialties: [],
    earnedCount: 41,
  }),
  cert({ code: 'SAA-C03', name: 'AWS Solutions Architect', earnedCount: 14 }),
  cert({
    code: 'AZ-900',
    name: 'Microsoft Azure Fundamentals',
    provider: azure,
    level: 'foundational',
    difficulty: 1,
    forAllSpecialties: true,
    specialties: [],
    earnedCount: 31,
  }),
  cert({
    code: 'AZ-400',
    name: 'Microsoft DevOps Engineer Expert',
    provider: azure,
    level: 'expert',
    difficulty: 4,
    specialties: ['GLOps'],
    earnedCount: 3,
  }),
  cert({
    code: 'RHCSA',
    name: 'Red Hat Certified System Administrator',
    examCode: 'EX200',
    provider: redHat,
    difficulty: 4,
    specialties: ['CIM', 'SSIR'],
    earnedCount: 7,
  }),
];

const codes = (items: CertificationSummary[]) => items.map((c) => c.code);

describe('filterCatalog', () => {
  it('sorts by most earned by default', () => {
    expect(codes(filterCatalog(catalog, {}))).toEqual([
      'CLF-C02',
      'AZ-900',
      'SAA-C03',
      'RHCSA',
      'AZ-400',
    ]);
  });

  it.each([
    ['cloud', ['CLF-C02']],
    ['az-9', ['AZ-900']],
    ['ex200', ['RHCSA']],
    ['  AZURE ', ['AZ-900']],
    ['kubernetes', []],
  ])('searches name, code and exam code: %s', (q, expected) => {
    expect(codes(filterCatalog(catalog, { q }))).toEqual(expected);
  });

  it('combines providers (or) with level and difficulty (and)', () => {
    const result = filterCatalog(catalog, {
      provider: ['AZURE', 'REDHAT'],
      level: ['associate', 'expert'],
      maxDifficulty: 4,
    });
    expect(codes(result)).toEqual(['RHCSA', 'AZ-400']);
  });

  it('keeps certifications for every specialty in a specialty filter', () => {
    expect(codes(filterCatalog(catalog, { specialty: ['GLOps'] }))).toEqual([
      'CLF-C02',
      'AZ-900',
      'AZ-400',
    ]);
  });

  it('caps the difficulty', () => {
    expect(codes(filterCatalog(catalog, { maxDifficulty: 1 }))).toEqual(['CLF-C02', 'AZ-900']);
  });

  it.each([
    ['name', ['CLF-C02', 'SAA-C03', 'AZ-900', 'AZ-400', 'RHCSA']],
    ['difficulty', ['CLF-C02', 'AZ-900', 'SAA-C03', 'AZ-400', 'RHCSA']],
    ['level', ['CLF-C02', 'AZ-900', 'SAA-C03', 'RHCSA', 'AZ-400']],
  ] as const)('sorts by %s', (sort, expected) => {
    expect(codes(filterCatalog(catalog, { sort }))).toEqual(expected);
  });
});

describe('catalogFacets', () => {
  it('counts each option with the other filters applied, not its own', () => {
    const facets = catalogFacets(catalog, { provider: ['AWS'], level: ['associate'] });
    // Provider counts ignore the provider filter: one associate per provider.
    expect(facets.provider).toEqual({ AWS: 1, REDHAT: 1 });
    // Level counts ignore the level filter: AWS has one foundational and one associate.
    expect(facets.level).toEqual({ foundational: 1, associate: 1 });
    // All-specialty certifications count for every specialty.
    expect(facets.specialty).toEqual({ CIM: 1 });
  });

  it('counts all-specialty certifications in every specialty', () => {
    const facets = catalogFacets(catalog, {});
    expect(facets.specialty.DMWM).toBe(2);
    expect(facets.specialty.CIM).toBe(4);
  });
});

describe('parseCatalogQuery', () => {
  it('reads a shared link', () => {
    expect(
      parseCatalogQuery(
        new URLSearchParams(
          'q=cloud&provider=aws,AZURE&level=associate&specialty=CIM,SSIR&maxDifficulty=3&sort=name',
        ),
      ),
    ).toEqual({
      q: 'cloud',
      provider: ['AWS', 'AZURE'],
      level: ['associate'],
      specialty: ['CIM', 'SSIR'],
      maxDifficulty: 3,
      sort: 'name',
    });
  });

  it('drops bad values instead of failing', () => {
    expect(
      parseCatalogQuery({
        level: 'associate,master',
        specialty: 'NOPE',
        maxDifficulty: '9',
        sort: 'random',
        provider: ['aws', 'aws'],
      }),
    ).toEqual({ level: ['associate'], provider: ['AWS'] });
  });
});

describe('serializeCatalogQuery', () => {
  it('round-trips and leaves defaults out', () => {
    const query = {
      q: 'cloud',
      provider: ['AWS'],
      level: ['expert', 'associate'] as const,
      maxDifficulty: 3,
      sort: 'name' as const,
    };
    const search = serializeCatalogQuery({ ...query, level: [...query.level] });
    expect(search).toBe('q=cloud&provider=AWS&level=associate,expert&maxDifficulty=3&sort=name');
    expect(parseCatalogQuery(new URLSearchParams(search))).toEqual({
      ...query,
      level: ['associate', 'expert'],
    });
    expect(serializeCatalogQuery({ maxDifficulty: 5, sort: 'earned', q: ' ' })).toBe('');
  });
});

describe('activeFilterCount', () => {
  it('counts each ticked option and a difficulty cap', () => {
    expect(activeFilterCount({ provider: ['AWS', 'AZURE'], maxDifficulty: 3, q: 'x' })).toBe(3);
    expect(activeFilterCount({ maxDifficulty: 5 })).toBe(0);
  });
});

describe('paginateCatalog', () => {
  const items = Array.from({ length: 30 }, (_, i) => i + 1);

  it('returns the requested page and where it sits in the list', () => {
    const second = paginateCatalog(items, 2);
    expect(second.items).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(second).toMatchObject({ page: 2, pageCount: 3, first: 13, last: 24 });
  });

  it('has a shorter last page', () => {
    expect(paginateCatalog(items, 3)).toMatchObject({ first: 25, last: 30, pageCount: 3 });
  });

  it('falls back to the last page past the end, and the first below it', () => {
    expect(paginateCatalog(items, 99).page).toBe(3);
    expect(paginateCatalog(items, 0).page).toBe(1);
  });

  it('has one empty page when nothing matches', () => {
    expect(paginateCatalog([], 4)).toEqual({ items: [], page: 1, pageCount: 1, first: 0, last: 0 });
  });
});

describe('parseCatalogPage', () => {
  it.each([
    ['3', 3],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['abc', 1],
    [undefined, 1],
  ])('reads %s as page %i', (page, expected) => {
    expect(parseCatalogPage({ page })).toBe(expected);
  });

  it('reads a URL', () => {
    expect(parseCatalogPage(new URLSearchParams('q=aws&page=2'))).toBe(2);
  });

  it('is not part of the filters, and the first page stays out of the URL', () => {
    expect(parseCatalogQuery(new URLSearchParams('page=2'))).toEqual({});
    expect(serializeCatalogQuery({ q: 'aws' }, 2)).toBe('q=aws&page=2');
    expect(serializeCatalogQuery({ q: 'aws' }, 1)).toBe('q=aws');
  });
});
