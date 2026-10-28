import { seedData } from './index';
import { validateSeedData, type SeedData } from './schema';

describe('seed data', () => {
  it('is valid', () => {
    expect(() => validateSeedData(seedData)).not.toThrow();
  });

  it('has the funded catalog from the Landing screen: 10 providers, 44 certifications', () => {
    expect(seedData.providers).toHaveLength(10);
    expect(seedData.certifications).toHaveLength(44);
  });

  it('has 6 specialties and 7 paths', () => {
    expect(seedData.specialties).toHaveLength(6);
    expect(seedData.paths.map((p) => p.code).sort()).toEqual(
      ['AIOT', 'CIM', 'DMWM', 'FOND', 'GLOps', 'SDIA', 'SSIR'].sort(),
    );
  });

  it('keeps SAA-C03 identical to the Fiche-certification design', () => {
    const saa = seedData.certifications.find((c) => c.code === 'SAA-C03');
    const chapters = saa?.domains.flatMap((d) => d.chapters) ?? [];
    expect(chapters).toHaveLength(11);
    expect(saa?.domains.map((d) => d.weight)).toEqual([30, 26, 24, 20]);
  });

  it('reports broken references', () => {
    const broken: SeedData = {
      ...seedData,
      paths: [{ code: 'FOND', name: 'Fundamentals', nodes: [{ cert: 'NOPE', col: 0, row: 0 }] }],
    };
    expect(() => validateSeedData(broken)).toThrow(/unknown cert NOPE/);
  });
});
