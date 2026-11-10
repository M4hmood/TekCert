import { randomUUID } from 'node:crypto';
import {
  ActivityFeedSchema,
  CertificationCommunitySchema,
  CertificationDetailSchema,
  ChapterTickResultSchema,
  DashboardSchema,
  MyCertificationProgressSchema,
  MyPointsSchema,
  PROGRESS_PROBLEM,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, onboardedStudent, type TestApp } from './test-app';

type Agent = ReturnType<typeof request.agent>;

describe('Progress, points and dashboard (e2e)', () => {
  let t: TestApp;
  let db: DataSource;
  const chapterCache = new Map<string, string[]>();

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const ing4Cim = { year: 4, specialty: 'CIM', group: 'A' };
  const ing4CimB = { year: 4, specialty: 'CIM', group: 'B' };
  const ing4Ssir = { year: 4, specialty: 'SSIR', group: 'A' };

  /** Chapter ids of a certification, in syllabus order. */
  const chaptersOf = async (slug: string): Promise<string[]> => {
    const cached = chapterCache.get(slug);
    if (cached) return cached;
    const detail = CertificationDetailSchema.parse(
      (await request(t.app.getHttpServer()).get(`/certifications/${slug}`).expect(200)).body,
    );
    const ids = detail.domains.flatMap((d) => d.chapters).map((c) => c.id);
    chapterCache.set(slug, ids);
    return ids;
  };
  const need = (chapterId: string | undefined): string => {
    if (!chapterId) throw new Error('The seed has fewer chapters than this test needs');
    return chapterId;
  };
  const tick = async (agent: Agent, chapterId: string | undefined, status = 200) =>
    (await agent.put(`/me/chapters/${need(chapterId)}`).expect(status)).body;
  const untick = async (agent: Agent, chapterId: string | undefined) =>
    ChapterTickResultSchema.parse(
      (await agent.delete(`/me/chapters/${need(chapterId)}`).expect(200)).body,
    );
  const points = async (agent: Agent) =>
    MyPointsSchema.parse((await agent.get('/me/points').expect(200)).body);
  const ledger = async (userId: string) =>
    db.query<{ delta: number; reason: string }[]>(
      'SELECT delta, reason FROM point_events WHERE user_id = $1 ORDER BY created_at',
      [userId],
    );
  const feed = async (agent: Agent, scope = 'institute') =>
    ActivityFeedSchema.parse((await agent.get(`/activity?scope=${scope}`).expect(200)).body);
  const dashboard = async (agent: Agent) =>
    DashboardSchema.parse((await agent.get('/me/dashboard').expect(200)).body);

  describe('PUT / DELETE /me/chapters/:chapterId', () => {
    it('ticks for +10 and unticks for −10, once each', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      await s.agent.put('/me/preparations/saa-c03').expect(201);
      const [first] = await chaptersOf('saa-c03');

      const done = ChapterTickResultSchema.parse(await tick(s.agent, first));
      expect(done).toMatchObject({
        changed: true,
        delta: 10,
        points: 10,
        certification: { slug: 'saa-c03', done: 1, total: 11, pct: 9 },
        level: { name: 'Novice', toNext: 240 },
        newBadges: ['first_step'],
      });
      const again = ChapterTickResultSchema.parse(await tick(s.agent, first));
      expect(again).toMatchObject({ changed: false, delta: 0, points: 10, newBadges: [] });

      expect(await untick(s.agent, first)).toMatchObject({ changed: true, delta: -10, points: 0 });
      expect(await untick(s.agent, first)).toMatchObject({ changed: false, delta: 0, points: 0 });

      expect(await ledger(s.id)).toEqual([
        { delta: 10, reason: 'chapter_done' },
        { delta: -10, reason: 'chapter_undone' },
      ]);
    });

    it('records one ledger row for concurrent ticks of the same chapter', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      await s.agent.put('/me/preparations/az-104').expect(201);
      const [first] = await chaptersOf('az-104');
      const results = await Promise.all(
        Array.from({ length: 10 }, () => s.agent.put(`/me/chapters/${first}`)),
      );
      expect(results.map((r) => r.status)).toEqual(Array(10).fill(200));
      expect(await ledger(s.id)).toHaveLength(1);
      expect((await points(s.agent)).points).toBe(10);
    });

    it('keeps the points equal to the ledger after any sequence', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      await s.agent.put('/me/preparations/clf-c02').expect(201);
      const ids = await chaptersOf('clf-c02');
      // A fixed pseudo-random walk, so a failure is reproducible.
      let seed = 7;
      for (let i = 0; i < 30; i++) {
        seed = (seed * 31 + 11) % 97;
        const id = ids[seed % ids.length];
        if (seed % 3 === 0) await untick(s.agent, id);
        else await tick(s.agent, id);
      }
      const [{ ticked, sum }] = await db.query<[{ ticked: number; sum: number }]>(
        `SELECT
           (SELECT COUNT(*)::int FROM chapter_progress WHERE user_id = $1) AS ticked,
           (SELECT COALESCE(SUM(delta), 0)::int FROM point_events WHERE user_id = $1) AS sum`,
        [s.id],
      );
      expect(sum).toBe(ticked * 10);
      expect((await points(s.agent)).points).toBe(sum);
    });

    it('refuses a certification not started or already held, and unknown chapters', async () => {
      const s = await onboardedStudent(t, ing4Cim, ['clf-c02']);
      const [held] = await chaptersOf('clf-c02');
      const [notStarted] = await chaptersOf('az-900');
      expect((await tick(s.agent, held, 409)).type).toBe(PROGRESS_PROBLEM.notPreparing);
      expect((await tick(s.agent, notStarted, 409)).type).toBe(PROGRESS_PROBLEM.notPreparing);
      await tick(s.agent, randomUUID(), 404);
      await tick(s.agent, 'not-a-uuid', 400);
      await request(t.app.getHttpServer()).put(`/me/chapters/${notStarted}`).expect(401);
      expect(await ledger(s.id)).toEqual([]);
    });
  });

  describe('the ledger', () => {
    it('refuses updates and direct deletes, but goes with a deleted user', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      await s.agent.put('/me/preparations/saa-c03').expect(201);
      await tick(s.agent, (await chaptersOf('saa-c03'))[0]);

      await expect(
        db.query('UPDATE point_events SET delta = 500 WHERE user_id = $1', [s.id]),
      ).rejects.toThrow(/append-only/);
      await expect(db.query('DELETE FROM point_events WHERE user_id = $1', [s.id])).rejects.toThrow(
        /append-only/,
      );
      expect(await ledger(s.id)).toHaveLength(1);

      await db.query('DELETE FROM users WHERE id = $1', [s.id]);
      expect(await ledger(s.id)).toEqual([]);
    });
  });

  describe('badges and levels', () => {
    it('unlocks Dedicated at 30 chapters and keeps it after an untick', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      const ids: string[] = [];
      for (const slug of ['saa-c03', 'az-104', 'clf-c02', 'az-900', 'rhcsa']) {
        await s.agent.put(`/me/preparations/${slug}`).expect(201);
        ids.push(...(await chaptersOf(slug)));
      }
      expect(ids.length).toBeGreaterThanOrEqual(30);
      for (const id of ids.slice(0, 29)) await tick(s.agent, id);
      expect(
        (await points(s.agent)).badges.find((b) => b.key === 'dedicated')?.earnedAt,
      ).toBeNull();

      const thirtieth = ChapterTickResultSchema.parse(await tick(s.agent, ids[29]));
      expect(thirtieth.newBadges).toEqual(['dedicated']);
      await untick(s.agent, ids[29]);

      const mine = await points(s.agent);
      expect(mine.points).toBe(290);
      expect(mine.level.name).toBe('Bachelor');
      expect(mine.badges.map((b) => [b.key, b.earnedAt !== null])).toEqual([
        ['first_step', true],
        ['pioneer', false],
        ['flawless', false],
        ['multi_cloud', false],
        ['dedicated', true],
      ]);
    });

    it('announces a level once, even when ticking around the threshold', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      await s.agent.put('/me/preparations/saa-c03').expect(201);
      const [a, b] = await chaptersOf('saa-c03');
      // 240 points from earlier chapters (inserting is the one thing the ledger allows).
      await db.query(
        `INSERT INTO point_events (user_id, delta, reason) SELECT $1, 10, 'chapter_done' FROM generate_series(1, 24)`,
        [s.id],
      );
      expect(ChapterTickResultSchema.parse(await tick(s.agent, a)).level.name).toBe('Bachelor');
      await untick(s.agent, a);
      await tick(s.agent, a);
      await tick(s.agent, b);

      const viewer = await onboardedStudent(t, ing4Cim);
      const levels = (await feed(viewer.agent)).items.filter(
        (item) => item.person.id === s.id && item.kind === 'level_reached',
      );
      expect(levels.map((item) => item.level)).toEqual([2]);
    });
  });

  describe('GET /me/certifications/:slug', () => {
    it('returns my status and the chapters I ticked', async () => {
      const s = await onboardedStudent(t, ing4Cim);
      const before = MyCertificationProgressSchema.parse(
        (await s.agent.get('/me/certifications/az-104').expect(200)).body,
      );
      expect(before).toMatchObject({ status: null, since: null, doneChapterIds: [], done: 0 });

      await s.agent.put('/me/preparations/az-104').expect(201);
      const [, second] = await chaptersOf('az-104');
      await tick(s.agent, second);
      const after = MyCertificationProgressSchema.parse(
        (await s.agent.get('/me/certifications/az-104').expect(200)).body,
      );
      expect(after).toMatchObject({ status: 'in_progress', doneChapterIds: [second], done: 1 });
      await s.agent.get('/me/certifications/not-a-cert').expect(404);
    });
  });

  describe('GET /activity', () => {
    it('rolls chapters up per day, follows unticks and never shows me', async () => {
      const s = await onboardedStudent(t, ing4Cim, [], { firstName: 'Skander' });
      await s.agent.put('/me/preparations/az-104').expect(201);
      const [a, b] = await chaptersOf('az-104');
      await tick(s.agent, a);
      await tick(s.agent, b);

      const viewer = await onboardedStudent(t, ing4CimB);
      const lines = async () =>
        (await feed(viewer.agent, 'specialty')).items.filter((item) => item.person.id === s.id);
      expect((await lines()).map((item) => [item.kind, item.count])).toEqual([
        ['chapters_done', 2],
        ['badge_earned', null],
        ['certification_started', null],
      ]);
      expect((await lines())[0]).toMatchObject({
        certification: { code: 'AZ-104', slug: 'az-104' },
        person: { firstName: 'Skander', group: 'ING-4 CIM' },
      });

      await untick(s.agent, b);
      expect((await lines())[0]).toMatchObject({ kind: 'chapters_done', count: 1 });
      await untick(s.agent, a);
      expect((await lines()).map((item) => item.kind)).toEqual([
        'badge_earned',
        'certification_started',
      ]);

      const own = (await feed(s.agent)).items.filter((item) => item.person.id === s.id);
      expect(own).toEqual([]);
    });

    it('filters by scope relative to me', async () => {
      const s = await onboardedStudent(t, ing4Ssir);
      await s.agent.put('/me/preparations/az-500').expect(201);

      const sameClass = await onboardedStudent(t, ing4Ssir);
      const otherSpecialty = await onboardedStudent(t, ing4Cim);
      const seen = async (agent: Agent, scope: string) =>
        (await feed(agent, scope)).items.some((item) => item.person.id === s.id);

      expect(await seen(sameClass.agent, 'class')).toBe(true);
      expect(await seen(sameClass.agent, 'specialty')).toBe(true);
      expect(await seen(otherSpecialty.agent, 'specialty')).toBe(false);
      expect(await seen(otherSpecialty.agent, 'year')).toBe(true);
      expect(await seen(otherSpecialty.agent, 'institute')).toBe(true);
      await request(t.app.getHttpServer()).get('/activity').expect(401);
    });
  });

  describe('GET /me/dashboard', () => {
    it('is empty for a new student, with the first step of the path', async () => {
      const s = await onboardedStudent(t, ing4Cim, [], { firstName: 'Mariem' });
      const d = await dashboard(s.agent);
      expect(d).toMatchObject({
        firstName: 'Mariem',
        group: 'ING-4 CIM',
        specialty: 'CIM',
        empty: true,
        current: null,
        points: 0,
        level: { name: 'Novice' },
        next: { code: 'CLF-C02', after: null },
        path: { code: 'CIM', kind: 'specialty', heldCount: 0 },
      });
      // Progression order: column, then row.
      expect(d.path?.nodes.map((n) => n.code)).toEqual([
        'CLF-C02',
        'AZ-900',
        'RHCSA',
        'SAA-C03',
        'AZ-104',
        'LFCS',
        'SOA-C03',
        'MCSA',
        'CKA',
      ]);
      expect(d.next?.studyMinutes).toBeGreaterThan(0);
    });

    it('counts the students of my year and specialty who have started', async () => {
      const mate = await onboardedStudent(t, ing4CimB);
      await mate.agent.put('/me/preparations/az-900').expect(201);
      const ssir = await onboardedStudent(t, ing4Ssir);
      await ssir.agent.put('/me/preparations/az-900').expect(201);

      const s = await onboardedStudent(t, ing4Cim);
      const { groupStarted } = await dashboard(s.agent);
      expect(groupStarted.total).toBeGreaterThanOrEqual(1);
      expect(groupStarted.items.length).toBeLessThanOrEqual(3);
      expect(groupStarted.items.every((p) => p.group === 'ING-4 CIM')).toBe(true);
    });

    it('shows my current certification, my path and who else prepares it', async () => {
      const s = await onboardedStudent(t, ing4Cim, ['clf-c02']);
      await s.agent.put('/me/preparations/az-104').expect(201);
      await s.agent.put('/me/preparations/saa-c03').expect(201);
      const saa = await chaptersOf('saa-c03');
      await tick(s.agent, saa[0]);

      const mate = await onboardedStudent(t, { year: 5, specialty: 'CIM', group: 'A' }, [], {
        lastName: 'Mate',
      });
      await mate.agent.put('/me/preparations/saa-c03').expect(201);
      for (const id of saa.slice(0, 4)) await tick(mate.agent, id);

      const d = await dashboard(s.agent);
      expect(d.empty).toBe(false);
      expect(d.current).toMatchObject({ slug: 'saa-c03', done: 1, total: 11, pct: 9 });
      expect(d.current?.chapters[0]).toMatchObject({ id: saa[0], done: true });
      expect(d.path?.heldCount).toBe(1);
      const states = Object.fromEntries((d.path?.nodes ?? []).map((n) => [n.code, n.state]));
      expect(states).toMatchObject({
        'CLF-C02': 'held',
        'SAA-C03': 'in_progress',
        'AZ-104': 'in_progress',
        'SOA-C03': 'locked',
        'AZ-900': 'available',
      });
      expect(d.next).toMatchObject({ code: 'AZ-900', after: null });
      expect(d.alsoPreparing.items.find((p) => p.id === mate.id)).toMatchObject({
        group: 'ING-5 CIM',
        pct: 36,
      });

      // Who to ask shows the same percentage, never the chapters.
      const community = CertificationCommunitySchema.parse(
        (await s.agent.get('/certifications/saa-c03/community').expect(200)).body,
      );
      expect(community.preparing.items.find((p) => p.id === mate.id)?.pct).toBe(36);
    });

    it('is private to the student', async () => {
      await request(t.app.getHttpServer()).get('/me/dashboard').expect(401);
      await request(t.app.getHttpServer()).get('/me/points').expect(401);
    });
  });
});
