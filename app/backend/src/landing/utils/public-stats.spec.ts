import { buildPublicStats, type PublicStatsInput } from './public-stats';

const input = (overrides: Partial<PublicStatsInput> = {}): PublicStatsInput => ({
  students: [
    { id: 'a', specialty: 'CIM' },
    { id: 'b', specialty: 'CIM' },
    { id: 'c', specialty: 'SSIR' },
    { id: 'd', specialty: null },
  ],
  preparingIds: ['a', 'c', 'd', 'someone-not-counted'],
  certifications: [{ provider: 'AWS' }, { provider: 'AWS' }, { provider: 'AZURE' }],
  specialties: [
    { id: 's1', code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
    { id: 's2', code: 'SSIR', name: 'Systems Security', hue: 15 },
  ],
  paths: [
    {
      code: 'SSIR',
      name: 'Systems Security',
      specialtyId: 's2',
      fundamentals: false,
      nodes: [{ code: 'CEH', row: 0, col: 0 }],
    },
    {
      code: 'FOND',
      name: 'Fundamentals',
      specialtyId: null,
      fundamentals: true,
      nodes: [
        { code: 'AZ-900', row: 0, col: 1 },
        { code: 'CLF-C02', row: 0, col: 0 },
        { code: 'AI-900', row: 1, col: 0 },
      ],
    },
    {
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      specialtyId: 's1',
      fundamentals: false,
      nodes: [
        { code: 'SAA-C03', row: 0, col: 1 },
        { code: 'CLF-C02', row: 0, col: 0 },
        { code: 'SAP-C02', row: 0, col: 2 },
        { code: 'DOP-C02', row: 0, col: 3 },
      ],
    },
  ],
  trackLength: 3,
  ...overrides,
});

describe('buildPublicStats', () => {
  it('counts the catalog, the students and those preparing', () => {
    expect(buildPublicStats(input())).toMatchObject({
      certifications: 3,
      providers: 2,
      students: 4,
      // Someone who started a certification but isn't counted as a student stays out.
      preparing: 3,
    });
  });

  it('counts students preparing per specialty, in the given order', () => {
    expect(buildPublicStats(input()).bySpecialty).toEqual([
      { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225, preparing: 1 },
      { code: 'SSIR', name: 'Systems Security', hue: 15, preparing: 1 },
    ]);
  });

  it('lists Fundamentals first, then the specialties, each with its main track', () => {
    expect(buildPublicStats(input()).paths).toEqual([
      {
        code: 'FOND',
        name: 'Fundamentals',
        hue: null,
        certifications: 3,
        track: ['CLF-C02', 'AZ-900'],
        students: 1,
      },
      {
        code: 'CIM',
        name: 'Cloud Infrastructure Management',
        hue: 225,
        certifications: 4,
        track: ['CLF-C02', 'SAA-C03', 'SAP-C02'],
        students: 2,
      },
      {
        code: 'SSIR',
        name: 'Systems Security',
        hue: 15,
        certifications: 1,
        track: ['CEH'],
        students: 1,
      },
    ]);
  });

  it('answers with zeros for an empty institute', () => {
    const empty = buildPublicStats(input({ students: [], preparingIds: [], certifications: [] }));
    expect(empty).toMatchObject({ certifications: 0, providers: 0, students: 0, preparing: 0 });
    expect(empty.bySpecialty.every((specialty) => specialty.preparing === 0)).toBe(true);
    expect(empty.paths.every((path) => path.students === 0)).toBe(true);
  });

  it('lets no id or name of a student out', () => {
    const out = JSON.stringify(
      buildPublicStats(input({ students: [{ id: 'secret-student-id', specialty: 'CIM' }] })),
    );
    expect(out).not.toContain('secret-student-id');
  });
});
