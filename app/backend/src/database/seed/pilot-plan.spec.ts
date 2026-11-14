import {
  buildPilotStudents,
  PILOT_DEMO_EMAIL,
  type PilotCatalogEntry,
  tickDays,
} from './pilot-plan';

const catalog: PilotCatalogEntry[] = [
  { slug: 'clf-c02', specialties: [], forAll: true, chapterCount: 10 },
  { slug: 'saa-c03', specialties: ['CIM', 'GLOps'], forAll: false, chapterCount: 24 },
  { slug: 'ceh', specialties: ['SSIR'], forAll: false, chapterCount: 20 },
  { slug: 'az-204', specialties: ['GLOps'], forAll: false, chapterCount: 12 },
  { slug: 'draft', specialties: ['CIM'], forAll: false, chapterCount: 0 },
];
const chapters = new Map(catalog.map((cert) => [cert.slug, cert.chapterCount]));

describe('buildPilotStudents', () => {
  const students = buildPilotStudents(catalog);

  it('builds the same class on every run', () => {
    expect(buildPilotStudents(catalog)).toEqual(students);
  });

  it('has about 60 students, each with their own pilot address', () => {
    expect(students).toHaveLength(61);
    expect(new Set(students.map((student) => student.email)).size).toBe(students.length);
    for (const student of students) {
      expect(student.email).toMatch(/^pilot\.[a-z.]+@tek-up\.de$/);
    }
  });

  it('puts them in seeded classes, with a target specialty only before ING-4', () => {
    for (const student of students) {
      expect(student.classCode).toMatch(/^ING-[1-5](-[A-Za-z]+)?-[A-D]$/);
      if (/^ING-[45]/.test(student.classCode)) expect(student.targetSpecialty).toBeNull();
    }
    expect(new Set(students.map((student) => student.classCode)).size).toBe(5);
  });

  it('never ticks more chapters than a syllabus has, nor prepares what is already held', () => {
    for (const student of students) {
      const slugs = student.preparing.map((preparation) => preparation.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const preparation of student.preparing) {
        expect(student.held).not.toContain(preparation.slug);
        expect(preparation.chapters).toBeGreaterThanOrEqual(0);
        expect(preparation.chapters).toBeLessThanOrEqual(chapters.get(preparation.slug) ?? 0);
        expect(preparation.lastTickDaysAgo).toBeLessThanOrEqual(preparation.startedDaysAgo);
        expect(preparation.startedDaysAgo).toBeLessThanOrEqual(student.joinedDaysAgo);
        // A certification without a syllabus yet is never prepared.
        expect(preparation.slug).not.toBe('draft');
      }
    }
  });

  it('gives a specialty class only certifications of that specialty', () => {
    const ssir = students.filter((student) => student.classCode === 'ING-4-SSIR-A');
    for (const student of ssir) {
      for (const slug of [...student.held, ...student.preparing.map((p) => p.slug)]) {
        expect(['clf-c02', 'ceh']).toContain(slug);
      }
    }
  });

  it('mixes students who prepare, who hold, who hide their name and who only signed up', () => {
    expect(students.some((student) => student.preparing.length === 0)).toBe(true);
    expect(students.some((student) => student.preparing.length === 2)).toBe(true);
    expect(students.some((student) => student.held.length > 0)).toBe(true);
    expect(students.some((student) => !student.leaderboardVisible)).toBe(true);
    expect(students.some((student) => student.availableToHelp)).toBe(true);
  });

  it('starts with the demo account, part-way through a syllabus', () => {
    expect(students[0]).toMatchObject({
      email: PILOT_DEMO_EMAIL,
      classCode: 'ING-4-CIM-A',
      leaderboardVisible: true,
    });
    expect(students[0]?.preparing).toHaveLength(1);
    expect(students[0]?.preparing[0]?.chapters).toBeGreaterThan(0);
  });

  it('still builds a class from an empty catalog, with nothing prepared', () => {
    const empty = buildPilotStudents([]);
    expect(empty).toHaveLength(61);
    expect(empty.every((student) => !student.preparing.length && !student.held.length)).toBe(true);
  });
});

describe('tickDays', () => {
  it('spreads the ticks from the start to the last one, oldest first', () => {
    expect(tickDays({ slug: 'x', startedDaysAgo: 20, chapters: 5, lastTickDaysAgo: 0 })).toEqual([
      20, 15, 10, 5, 0,
    ]);
  });

  it('handles one tick and none', () => {
    expect(tickDays({ slug: 'x', startedDaysAgo: 9, chapters: 1, lastTickDaysAgo: 2 })).toEqual([
      2,
    ]);
    expect(tickDays({ slug: 'x', startedDaysAgo: 9, chapters: 0, lastTickDaysAgo: 2 })).toEqual([]);
  });
});
