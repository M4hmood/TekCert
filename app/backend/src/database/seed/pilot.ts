import 'dotenv/config';
import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { Algorithm, hash } from '@node-rs/argon2';
import {
  academicYearOf,
  type BadgeKey,
  badgesForChapters,
  levelFor,
  NewPasswordSchema,
  POINTS_PER_CHAPTER,
} from '@tekcert/types';
import { DataSource, type EntityManager, Like } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import {
  ActivityEvent,
  Certification,
  ChapterProgress,
  PointEvent,
  Preparation,
  SchoolClass,
  Specialty,
  User,
  UserBadge,
  UserCertification,
} from '../entities';
import {
  buildPilotStudents,
  PILOT_DEMO_EMAIL,
  PILOT_EMAIL_PREFIX,
  type PilotStudent,
  tickDays,
} from './pilot-plan';

/**
 * Demo data: about 60 invented students with several weeks of progress, so every screen has
 * something to show (ADR-024). Run it with `pnpm db:seed:pilot`, after `pnpm db:seed`.
 *
 * - It never runs in production: the real pilot class signs up by itself.
 * - The students can't sign in (their password is a random value nobody knows), apart from
 *   the demo account when PILOT_DEMO_PASSWORD is set.
 * - Running it again replaces the last pilot class; nobody else is touched.
 * - The points come from ledger rows, like real ones: 10 per chapter, summed when read.
 */

const DAY_MS = 86_400_000;
const TIME_ZONE = 'Africa/Tunis';
const tunisDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
/** The same settings as the app's PasswordService. */
const ARGON = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export interface PilotResult {
  students: number;
  preparing: number;
  chapters: number;
  /** True when the demo account got a password someone can sign in with. */
  demoCanSignIn: boolean;
}

export interface PilotOptions {
  /** The demo account's password; without it nobody can sign in to any pilot account. */
  demoPassword?: string;
  now?: Date;
  nodeEnv?: string;
}

export async function seedPilot(
  dataSource: DataSource,
  options: PilotOptions = {},
): Promise<PilotResult> {
  if ((options.nodeEnv ?? process.env.NODE_ENV) === 'production') {
    throw new Error('The pilot seed is demo data and never runs in production.');
  }
  const demoPassword = options.demoPassword || undefined;
  if (demoPassword) {
    const checked = NewPasswordSchema.safeParse(demoPassword);
    if (!checked.success) {
      throw new Error(`PILOT_DEMO_PASSWORD is too weak: ${checked.error.issues[0]?.message}`);
    }
  }
  const now = options.now ?? new Date();
  // A hash of bytes nobody keeps: these accounts have no password to guess.
  const unusable = await hash(randomBytes(32).toString('base64'), ARGON);
  const demoHash = demoPassword ? await hash(demoPassword, ARGON) : unusable;

  return dataSource.transaction(async (manager) => {
    const [classes, specialties, catalog] = await Promise.all([
      manager.find(SchoolClass),
      manager.find(Specialty),
      manager.find(Certification, {
        where: { isActive: true },
        relations: { specialties: true, chapters: true },
        order: { code: 'ASC', chapters: { order: 'ASC' } },
      }),
    ]);
    if (!catalog.length) throw new Error('The catalog is empty: run `pnpm db:seed` first.');
    const classByCode = new Map(classes.map((klass) => [klass.code, klass]));
    const specialtyByCode = new Map(specialties.map((specialty) => [specialty.code, specialty]));
    const certBySlug = new Map(catalog.map((cert) => [cert.slug, cert]));

    await manager.delete(User, { email: Like(`${PILOT_EMAIL_PREFIX}%@tek-up.de`) });

    const students = buildPilotStudents(
      catalog.map((cert) => ({
        slug: cert.slug,
        specialties: cert.specialties.map((specialty) => specialty.code),
        forAll: cert.forAllSpecialties,
        chapterCount: cert.chapters.length,
      })),
    );
    const result: PilotResult = {
      students: students.length,
      preparing: 0,
      chapters: 0,
      demoCanSignIn: Boolean(demoPassword),
    };

    for (const [index, student] of students.entries()) {
      const klass = classByCode.get(student.classCode);
      if (!klass) throw new Error(`Class ${student.classCode} is not seeded.`);
      // Each student gets their own minutes of the day, so feeds have a stable order. `step`
      // moves an event later within them; ten hours of margin keep everything in the past.
      const at = (daysAgo: number, step = 0) =>
        new Date(now.getTime() - daysAgo * DAY_MS - (600 + index * 7 - step) * 60_000);
      const joined = at(student.joinedDaysAgo);
      const user = await manager.save(
        manager.create(User, {
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          passwordHash: student.email === PILOT_DEMO_EMAIL ? demoHash : unusable,
          emailVerifiedAt: joined,
          visibilityConsentedAt: joined,
          leaderboardVisible: student.leaderboardVisible,
          availableToHelp: student.availableToHelp,
          classId: klass.id,
          targetSpecialtyId: student.targetSpecialty
            ? (specialtyByCode.get(student.targetSpecialty)?.id ?? null)
            : null,
          onboardingStep: 5,
          onboardingCompletedAt: joined,
          enrolmentConfirmedYear: academicYearOf(now),
        }),
      );
      const written = await writeProgress(manager, user.id, student, certBySlug, at);
      if (student.preparing.length) result.preparing += 1;
      result.chapters += written;
    }
    return result;
  });
}

/** Held and prepared certifications with their ticks, ledger rows, badges and feed lines. */
async function writeProgress(
  manager: EntityManager,
  userId: string,
  student: PilotStudent,
  certBySlug: Map<string, Certification>,
  at: (daysAgo: number, step?: number) => Date,
): Promise<number> {
  const joined = at(student.joinedDaysAgo);
  const held = student.held.flatMap((slug) => certBySlug.get(slug) ?? []);
  if (held.length) {
    await manager.insert(
      UserCertification,
      held.map((cert) => ({
        userId,
        certificationId: cert.id,
        status: 'unverified' as const,
        source: 'onboarding' as const,
        createdAt: joined,
      })),
    );
  }

  // Every tick of the student, oldest first, whatever the certification.
  const ticks: { cert: Certification; chapterId: string; at: Date }[] = [];
  const activity: Partial<ActivityEvent>[] = [];
  for (const preparation of student.preparing) {
    const cert = certBySlug.get(preparation.slug);
    if (!cert) continue;
    const started = at(preparation.startedDaysAgo, -1);
    await manager.insert(Preparation, { userId, certificationId: cert.id, startedAt: started });
    activity.push({
      userId,
      kind: 'certification_started',
      certificationId: cert.id,
      createdAt: started,
      updatedAt: started,
    });
    const days = tickDays({
      ...preparation,
      chapters: Math.min(preparation.chapters, cert.chapters.length),
    });
    days.forEach((daysAgo, i) => {
      const chapter = cert.chapters[i];
      if (chapter) ticks.push({ cert, chapterId: chapter.id, at: at(daysAgo, i) });
    });
    if (days.length > 0 && days.length === cert.chapters.length) {
      const done = at(preparation.lastTickDaysAgo, days.length);
      activity.push({
        userId,
        kind: 'syllabus_completed',
        certificationId: cert.id,
        createdAt: done,
        updatedAt: done,
      });
    }
  }
  ticks.sort((a, b) => a.at.getTime() - b.at.getTime());
  if (!ticks.length) {
    if (activity.length) await manager.insert(ActivityEvent, activity);
    return 0;
  }

  await manager.insert(
    ChapterProgress,
    ticks.map((tick) => ({
      userId,
      chapterId: tick.chapterId,
      certificationId: tick.cert.id,
      completedAt: tick.at,
    })),
  );
  await manager.insert(
    PointEvent,
    ticks.map((tick) => ({
      userId,
      delta: POINTS_PER_CHAPTER,
      reason: 'chapter_done' as const,
      certificationId: tick.cert.id,
      chapterId: tick.chapterId,
      createdAt: tick.at,
    })),
  );

  // Badges and levels at the tick that earned them, and one feed line per certification and day.
  const badges = new Map<BadgeKey, Date>();
  const levels = new Map<number, Date>();
  const perDay = new Map<string, { cert: Certification; day: string; count: number; at: Date }>();
  ticks.forEach((tick, i) => {
    for (const badge of badgesForChapters(i + 1))
      if (!badges.has(badge)) badges.set(badge, tick.at);
    const rank = levelFor((i + 1) * POINTS_PER_CHAPTER).rank;
    if (rank > 1 && !levels.has(rank)) levels.set(rank, tick.at);
    const day = tunisDay.format(tick.at);
    const key = `${tick.cert.id}:${day}`;
    const entry = perDay.get(key) ?? { cert: tick.cert, day, count: 0, at: tick.at };
    entry.count += 1;
    entry.at = tick.at;
    perDay.set(key, entry);
  });
  await manager.insert(
    UserBadge,
    [...badges].map(([badge, earnedAt]) => ({ userId, badge, earnedAt })),
  );
  for (const [badge, earnedAt] of badges) {
    activity.push({
      userId,
      kind: 'badge_earned',
      badge,
      createdAt: earnedAt,
      updatedAt: earnedAt,
    });
  }
  for (const [level, reachedAt] of levels) {
    activity.push({
      userId,
      kind: 'level_reached',
      level,
      createdAt: reachedAt,
      updatedAt: reachedAt,
    });
  }
  for (const entry of perDay.values()) {
    activity.push({
      userId,
      kind: 'chapters_done',
      certificationId: entry.cert.id,
      count: entry.count,
      day: entry.day,
      createdAt: entry.at,
      updatedAt: entry.at,
    });
  }
  await manager.insert(ActivityEvent, activity);
  return ticks.length;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const dataSource = await new DataSource(dataSourceOptions(url)).initialize();
  try {
    const result = await seedPilot(dataSource, { demoPassword: process.env.PILOT_DEMO_PASSWORD });
    console.log(
      `Pilot class ready: ${result.students} students, ${result.preparing} preparing, ${result.chapters} chapters finished.`,
    );
    console.log(
      result.demoCanSignIn
        ? `Sign in as ${PILOT_DEMO_EMAIL} with PILOT_DEMO_PASSWORD.`
        : 'No account can sign in. Set PILOT_DEMO_PASSWORD to open the demo account.',
    );
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
