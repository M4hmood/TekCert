import { randomUUID } from 'node:crypto';
import {
  CertificationDetailSchema,
  LEADERBOARD_TOP,
  MyProfileSettingsSchema,
  periodStart,
  SpecialtyLeaderboardSchema,
  StudentLeaderboardSchema,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, onboardedStudent, type TestApp } from './test-app';

type Agent = ReturnType<typeof request.agent>;

/**
 * Each test ranks its own class or specialty, none of which the other suites use, so the
 * boards hold exactly the students the test created.
 */
describe('Leaderboard (e2e)', () => {
  let t: TestApp;
  let db: DataSource;
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const board = async (agent: Agent, query: Record<string, string> = {}) =>
    StudentLeaderboardSchema.parse(
      (await agent.get('/leaderboard/students').query(query).expect(200)).body,
    );
  const chaptersOf = async (slug: string): Promise<string[]> => {
    const detail = CertificationDetailSchema.parse(
      (await request(t.app.getHttpServer()).get(`/certifications/${slug}`).expect(200)).body,
    );
    return detail.domains.flatMap((d) => d.chapters).map((c) => c.id);
  };
  /** Starts AZ-900 and ticks its first `count` chapters through the API. */
  const tick = async (agent: Agent, count: number) => {
    await agent.put('/me/preparations/az-900').expect((res) => {
      if (![200, 201].includes(res.status)) throw new Error(`start answered ${res.status}`);
    });
    const chapters = await chaptersOf('az-900');
    for (const chapter of chapters.slice(0, count)) {
      await agent.put(`/me/chapters/${chapter}`).expect(200);
    }
    return chapters;
  };
  /** A ledger row written at a past date: the API always writes "now". */
  const earnedAt = (userId: string, delta: number, at: Date) =>
    db.query(
      `INSERT INTO point_events (user_id, delta, reason, created_at) VALUES ($1, $2, $3, $4)`,
      [userId, delta, delta > 0 ? 'chapter_done' : 'chapter_undone', at],
    );
  const ledgerSum = async (userId: string, from: Date | null = null): Promise<number> => {
    const [row] = await db.query<{ total: number }[]>(
      `SELECT COALESCE(SUM(delta), 0)::int AS total FROM point_events
       WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2)`,
      [userId, from],
    );
    return row?.total ?? 0;
  };

  it('is for signed-in students only', async () => {
    const server = t.app.getHttpServer();
    await request(server).get('/leaderboard/students').expect(401);
    await request(server).get('/leaderboard/specialties').expect(401);
  });

  it('ranks a class on the ledger, ties sharing a rank', async () => {
    const klass = { year: 5, specialty: 'DMWM', group: 'D' };
    const first = await onboardedStudent(t, klass, [], { firstName: 'Omar' });
    const second = await onboardedStudent(t, klass, [], { firstName: 'Rania' });
    const tied = await onboardedStudent(t, klass, [], { firstName: 'Mehdi' });
    const me = await onboardedStudent(t, klass, [], { firstName: 'Yassine' });
    const chapters = await tick(first.agent, 3);
    await tick(second.agent, 1);
    await tick(tied.agent, 1);

    const seen = await board(me.agent, { scope: 'class', period: 'all' });
    expect(seen).toMatchObject({
      scope: 'class',
      period: 'all',
      periodLabel: 'All time',
      total: 4,
    });
    expect(seen.viewer).toEqual({ classCode: 'ING-5-DMWM-D', year: 5, specialty: 'DMWM' });
    expect(seen.rows.map((r) => [r.rank, r.points, r.chapters])).toEqual([
      [1, 30, 3],
      [2, 10, 1],
      [2, 10, 1],
      [4, 0, 0],
    ]);
    expect(seen.rows[0]).toMatchObject({
      position: 1,
      isMe: false,
      person: {
        id: first.id,
        firstName: 'Omar',
        classCode: 'ING-5-DMWM-D',
        year: 5,
        specialty: 'DMWM',
      },
    });
    expect(seen.rows[3]).toMatchObject({ isMe: true, person: { id: me.id } });
    expect(seen.me).toMatchObject({
      rank: 4,
      points: 0,
      visible: true,
      gap: { points: 10 },
      continue: null,
    });

    // Every row is the ledger's sum, before and after an untick.
    for (const row of seen.rows) {
      expect(row.points).toBe(await ledgerSum(row.person?.id ?? ''));
    }
    await first.agent.delete(`/me/chapters/${chapters[0]}`).expect(200);
    const after = await board(first.agent, { scope: 'class', period: 'all' });
    expect(after.rows[0]).toMatchObject({ rank: 1, points: 20, chapters: 2, isMe: true });
    expect(after.rows[0]?.points).toBe(await ledgerSum(first.id));
    expect(after.me).toMatchObject({
      rank: 1,
      gap: null,
      continue: { slug: 'az-900', code: 'AZ-900' },
    });
  });

  it('counts only the points of the month, the semester or all time', async () => {
    const klass = { year: 5, specialty: 'DMWM', group: 'C' };
    const me = await onboardedStudent(t, klass);
    const now = new Date();
    const month = periodStart('month', now) as Date;
    const semester = periodStart('semester', now) as Date;
    // One row just before each boundary, and one unticked chapter this month.
    await earnedAt(me.id, 10, new Date(semester.getTime() - HOUR));
    await earnedAt(me.id, 10, new Date(month.getTime() - HOUR));
    await tick(me.agent, 2);
    const chapters = await chaptersOf('az-900');
    await me.agent.delete(`/me/chapters/${chapters[1]}`).expect(200);

    const points = async (period: string) =>
      (await board(me.agent, { scope: 'class', period })).me?.points;
    expect(await points('month')).toBe(10);
    expect(await points('month')).toBe(await ledgerSum(me.id, month));
    expect(await points('semester')).toBe(await ledgerSum(me.id, semester));
    // The row before the month counts for the semester unless the month opens the semester.
    expect(await points('semester')).toBe(month.getTime() === semester.getTime() ? 10 : 20);
    expect(await points('all')).toBe(30);
    expect(await points('all')).toBe(await ledgerSum(me.id));
  });

  it('shows a negative month when a chapter from an earlier month is unticked', async () => {
    const klass = { year: 4, specialty: 'DMWM', group: 'D' };
    const me = await onboardedStudent(t, klass);
    const month = periodStart('month', new Date()) as Date;
    await earnedAt(me.id, 10, new Date(month.getTime() - DAY));
    await earnedAt(me.id, -10, new Date());

    const seen = await board(me.agent, { scope: 'class', period: 'month' });
    expect(seen.me).toMatchObject({ points: -10, chapters: -1 });
    expect((await board(me.agent, { scope: 'class', period: 'all' })).me?.points).toBe(0);
  });

  it('counts the places gained or lost over the last 7 days', async () => {
    const klass = { year: 4, specialty: 'DMWM', group: 'C' };
    const early = await onboardedStudent(t, klass);
    const late = await onboardedStudent(t, klass);
    const newcomer = await onboardedStudent(t, klass);
    await earnedAt(early.id, 30, new Date(Date.now() - 10 * DAY));
    await earnedAt(late.id, 10, new Date(Date.now() - 10 * DAY));
    await earnedAt(late.id, 50, new Date(Date.now() - DAY));
    await earnedAt(newcomer.id, 10, new Date(Date.now() - DAY));

    const seen = await board(late.agent, { scope: 'class', period: 'all' });
    // A week ago "early" led; "late" has passed them since.
    expect(seen.rows.map((r) => [r.person?.id, r.rank, r.change])).toEqual([
      [late.id, 1, 1],
      [early.id, 2, -1],
      // No points a week ago: nothing to compare with.
      [newcomer.id, 3, null],
    ]);
    expect(seen.me?.change).toBe(1);
  });

  it('shows a student who hides their name as Anonymous, except to themselves', async () => {
    const klass = { year: 4, specialty: 'DMWM', group: 'B' };
    const lastName = `Zq${randomUUID()
      .replace(/[^a-z]/g, '')
      .slice(0, 10)}`;
    const hidden = await onboardedStudent(t, klass, [], { firstName: 'Ines', lastName });
    const other = await onboardedStudent(t, klass);
    await tick(hidden.agent, 2);
    const saved = MyProfileSettingsSchema.parse(
      (await hidden.agent.patch('/me/profile').send({ leaderboardVisible: false }).expect(200))
        .body,
    );
    expect(saved).toEqual({ availableToHelp: false, leaderboardVisible: false });

    const res = await other.agent.get('/leaderboard/students?scope=class&period=all').expect(200);
    const seen = StudentLeaderboardSchema.parse(res.body);
    // Still ranked, with their points, but nothing says who it is.
    expect(seen.rows[0]).toEqual({
      rank: 1,
      position: 1,
      change: null,
      points: 20,
      chapters: 2,
      isMe: false,
      person: null,
    });
    expect(seen.me?.gap).toEqual({ points: 20, firstName: null });
    const raw = JSON.stringify(res.body);
    for (const secret of [hidden.id, hidden.email, lastName, 'Ines']) {
      expect(raw).not.toContain(secret);
    }

    const own = await board(hidden.agent, { scope: 'class', period: 'all' });
    expect(own.rows[0]).toMatchObject({ isMe: true, person: { id: hidden.id, lastName } });
    expect(own.me).toMatchObject({ rank: 1, visible: false });

    // Switching it back names them again.
    await hidden.agent.patch('/me/profile').send({ leaderboardVisible: true }).expect(200);
    expect((await board(other.agent, { scope: 'class', period: 'all' })).rows[0]?.person?.id).toBe(
      hidden.id,
    );
  });

  it('shows the top 20, then me with two neighbours on each side', async () => {
    const klass = { year: 5, specialty: 'SDIA', group: 'D' };
    const others = LEADERBOARD_TOP + 5;
    for (let i = 0; i < others; i++) {
      const student = await onboardedStudent(t, klass);
      await earnedAt(student.id, (others - i) * 10, new Date());
    }
    const me = await onboardedStudent(t, klass);

    const seen = await board(me.agent, { scope: 'class', period: 'all' });
    expect(seen.total).toBe(others + 1);
    expect(seen.rows.map((r) => r.position)).toEqual([
      ...Array.from({ length: LEADERBOARD_TOP }, (_, i) => i + 1),
      others - 1,
      others,
      others + 1,
    ]);
    expect(seen.rows.at(-1)).toMatchObject({ isMe: true, rank: others + 1, points: 0 });
    expect(seen.me).toMatchObject({ rank: others + 1, gap: { points: 10 } });

    // "My specialty" spans the years; the institute holds everyone.
    const senior = await board(me.agent, { scope: 'specialty', period: 'all' });
    expect(senior.total).toBe(others + 1);
    expect((await board(me.agent, { scope: 'institute', period: 'all' })).total).toBeGreaterThan(
      others + 1,
    );
  });

  it('ranks specialties by average points per student, target specialties included', async () => {
    const a = await onboardedStudent(t, { year: 4, specialty: 'GLOps', group: 'A' });
    const b = await onboardedStudent(t, { year: 5, specialty: 'GLOps', group: 'B' });
    const junior = await onboardedStudent(t, { year: 2, targetSpecialty: 'GLOps', group: 'D' });
    await onboardedStudent(t, { year: 1, targetSpecialty: null, group: 'D' });
    await earnedAt(a.id, 20, new Date());
    await earnedAt(junior.id, 10, new Date());

    const seen = SpecialtyLeaderboardSchema.parse(
      (await b.agent.get('/leaderboard/specialties?period=all').expect(200)).body,
    );
    expect(seen.periodLabel).toBe('All time');
    const glops = seen.items.find((item) => item.code === 'GLOps');
    expect(glops).toMatchObject({ students: 3, average: 10, isMine: true });
    expect(seen.items.filter((item) => item.isMine)).toHaveLength(1);
    // Highest average first, ranks in step.
    const averages = seen.items.map((item) => item.average);
    expect(averages).toEqual([...averages].sort((x, y) => y - x));
    expect(seen.items[0]?.rank).toBe(1);

    // The junior aims for GLOps, so it is theirs too.
    const forJunior = SpecialtyLeaderboardSchema.parse(
      (await junior.agent.get('/leaderboard/specialties').expect(200)).body,
    );
    expect(forJunior.period).toBe('month');
    expect(forJunior.items.find((item) => item.isMine)?.code).toBe('GLOps');
  });

  it('rejects an unknown scope or period', async () => {
    const { agent } = await onboardedStudent(t, { year: 5, specialty: 'SDIA', group: 'C' });
    await agent.get('/leaderboard/students?scope=year').expect(400);
    await agent.get('/leaderboard/students?period=week').expect(400);
    await agent.get('/leaderboard/specialties?period=decade').expect(400);
    await agent.patch('/me/profile').send({}).expect(400);
  });
});
