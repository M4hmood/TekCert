/**
 * The invented class of the pilot seed, as plain data: who the students are, what they hold
 * and what they prepare. No database here, and no randomness beyond a fixed sequence, so the
 * same class comes out on every run and a demo looks the same from one day to the next.
 */

export interface PilotCatalogEntry {
  slug: string;
  /** Specialty codes it belongs to; every specialty when `forAll`. */
  specialties: string[];
  forAll: boolean;
  chapterCount: number;
}

export interface PilotPreparation {
  slug: string;
  /** Days since the student pressed Start. */
  startedDaysAgo: number;
  /** Chapters ticked since, spread from the start to `lastTickDaysAgo`. */
  chapters: number;
  lastTickDaysAgo: number;
}

export interface PilotStudent {
  firstName: string;
  lastName: string;
  email: string;
  /** A seeded class: ING-4-CIM-A or ING-2-B. */
  classCode: string;
  /** ING-1 to 3 only: the specialty aimed for; null when undecided or in ING-4/5. */
  targetSpecialty: string | null;
  leaderboardVisible: boolean;
  availableToHelp: boolean;
  joinedDaysAgo: number;
  held: string[];
  preparing: PilotPreparation[];
}

/** Every pilot address starts like this, which is how a new run finds the last one. */
export const PILOT_EMAIL_PREFIX = 'pilot.';
export const PILOT_DEMO_EMAIL = `${PILOT_EMAIL_PREFIX}demo@tek-up.de`;

const CLASSES: { code: string; specialty: string | null; students: number }[] = [
  { code: 'ING-4-CIM-A', specialty: 'CIM', students: 18 },
  { code: 'ING-4-SSIR-A', specialty: 'SSIR', students: 12 },
  { code: 'ING-5-GLOps-A', specialty: 'GLOps', students: 10 },
  { code: 'ING-3-A', specialty: null, students: 10 },
  { code: 'ING-2-B', specialty: null, students: 10 },
];
const TARGETS = ['CIM', 'SDIA', 'SSIR', 'GLOps', null];

const FIRST_NAMES = [
  'Yassine',
  'Rania',
  'Mehdi',
  'Salma',
  'Karim',
  'Ons',
  'Amine',
  'Ines',
  'Omar',
  'Nour',
  'Aziz',
  'Mariem',
  'Firas',
  'Yasmine',
  'Hamza',
  'Syrine',
  'Skander',
  'Emna',
  'Wassim',
  'Asma',
  'Bilel',
  'Chaima',
  'Seif',
  'Rim',
  'Malek',
  'Oumaima',
  'Ghassen',
  'Farah',
  'Nidhal',
  'Sarra',
];
const LAST_NAMES = [
  'Ben Amor',
  'Gharbi',
  'Trabelsi',
  'Jlassi',
  'Mejri',
  'Ben Salah',
  'Haddad',
  'Kacem',
  'Mansour',
  'Jaziri',
  'Bouzid',
  'Chaabane',
  'Dridi',
  'Ferchichi',
  'Guesmi',
  'Hammami',
  'Khelifi',
  'Louati',
  'Mabrouk',
  'Nasri',
];

/** A small fixed-sequence generator (mulberry32): the same numbers on every run. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z]+/g, '');

/**
 * About 60 students in five classes, plus the demo account in the first one. Most prepare one
 * or two certifications of their specialty, a few hold one, and some have not started.
 */
export function buildPilotStudents(catalog: readonly PilotCatalogEntry[]): PilotStudent[] {
  const next = sequence(20261114);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T;
  const between = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const fits = (specialty: string | null) =>
    catalog.filter(
      (cert) =>
        cert.chapterCount > 0 &&
        (cert.forAll || specialty === null || cert.specialties.includes(specialty)),
    );

  const students: PilotStudent[] = [];
  const taken = new Set<string>();
  const person = (): Pick<PilotStudent, 'firstName' | 'lastName' | 'email'> => {
    for (;;) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const email = `${PILOT_EMAIL_PREFIX}${slugify(firstName)}.${slugify(lastName)}@tek-up.de`;
      if (taken.has(email)) continue;
      taken.add(email);
      return { firstName, lastName, email };
    }
  };

  for (const klass of CLASSES) {
    for (let i = 0; i < klass.students; i++) {
      const target = klass.specialty ? null : pick(TARGETS);
      const pool = fits(klass.specialty ?? target);
      const joinedDaysAgo = between(20, 60);
      // One student in six has only signed up; the others prepare one or two certifications.
      const wanted = pool.length === 0 || next() < 0.16 ? 0 : next() < 0.3 ? 2 : 1;
      const chosen = new Set<string>();
      const held = next() < 0.3 && pool.length > 0 ? [pick(pool).slug] : [];
      const preparing: PilotPreparation[] = [];
      while (preparing.length < wanted && chosen.size + held.length < pool.length) {
        const cert = pick(pool);
        if (chosen.has(cert.slug) || held.includes(cert.slug)) continue;
        chosen.add(cert.slug);
        const startedDaysAgo = between(3, joinedDaysAgo);
        // A few finish a syllabus; most are somewhere along it.
        const share = next() < 0.08 ? 1 : next() * 0.85;
        preparing.push({
          slug: cert.slug,
          startedDaysAgo,
          chapters: Math.round(cert.chapterCount * share),
          lastTickDaysAgo: between(0, Math.min(6, startedDaysAgo)),
        });
      }
      students.push({
        ...person(),
        classCode: klass.code,
        targetSpecialty: target,
        leaderboardVisible: next() >= 0.1,
        availableToHelp: next() < 0.25,
        joinedDaysAgo,
        held,
        preparing,
      });
    }
  }

  // The account a presenter signs in with: in the largest class, part-way through one syllabus.
  const demoCert = fits('CIM')[0];
  students.unshift({
    firstName: 'Demo',
    lastName: 'Student',
    email: PILOT_DEMO_EMAIL,
    classCode: 'ING-4-CIM-A',
    targetSpecialty: null,
    leaderboardVisible: true,
    availableToHelp: true,
    joinedDaysAgo: 45,
    held: [],
    preparing: demoCert
      ? [
          {
            slug: demoCert.slug,
            startedDaysAgo: 30,
            chapters: Math.max(1, Math.round(demoCert.chapterCount * 0.4)),
            lastTickDaysAgo: 1,
          },
        ]
      : [],
  });
  return students;
}

/**
 * When each of `count` ticks happened, in days ago, oldest first: spread evenly from the start
 * to the last tick.
 */
export function tickDays(preparation: PilotPreparation): number[] {
  const { chapters, startedDaysAgo, lastTickDaysAgo } = preparation;
  if (chapters <= 0) return [];
  if (chapters === 1) return [lastTickDaysAgo];
  const span = startedDaysAgo - lastTickDaysAgo;
  return Array.from({ length: chapters }, (_, i) =>
    Math.round(startedDaysAgo - (span * i) / (chapters - 1)),
  );
}
