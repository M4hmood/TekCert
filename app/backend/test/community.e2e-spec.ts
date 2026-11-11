import { randomUUID } from 'node:crypto';
import {
  CertificationDetailSchema,
  DIRECTORY_PAGE_SIZE,
  DirectorySchema,
  MyProfileSettingsSchema,
  StudentProfileSchema,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  onboardedStudent,
  signUpAndVerify,
  signUpRequest,
  type TestApp,
  uniqueEmail,
} from './test-app';

type Agent = ReturnType<typeof request.agent>;

describe('Community directory and profiles (e2e)', () => {
  let t: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const ing4CimA = { year: 4, specialty: 'CIM', group: 'A' };
  const ing4CimB = { year: 4, specialty: 'CIM', group: 'B' };
  const ing5Cim = { year: 5, specialty: 'CIM', group: 'A' };
  const ing4Ssir = { year: 4, specialty: 'SSIR', group: 'A' };
  const ing2Cim = { year: 2, targetSpecialty: 'CIM', group: 'B' };

  /**
   * The test database keeps students from earlier tests, so each test names its own with a
   * family name nobody else has and searches for it.
   */
  const family = () =>
    `Zq${randomUUID()
      .replace(/[^a-z]/g, '')
      .slice(0, 10)}`;
  const directory = async (agent: Agent, query: Record<string, string | number> = {}) =>
    DirectorySchema.parse((await agent.get('/community/students').query(query).expect(200)).body);
  const profile = async (agent: Agent, id: string) =>
    StudentProfileSchema.parse((await agent.get(`/community/students/${id}`).expect(200)).body);
  const names = (list: { items: { firstName: string }[] }) => list.items.map((p) => p.firstName);
  const firstChapters = async (slug: string, count: number): Promise<string[]> => {
    const detail = CertificationDetailSchema.parse(
      (await request(t.app.getHttpServer()).get(`/certifications/${slug}`).expect(200)).body,
    );
    return detail.domains
      .flatMap((d) => d.chapters)
      .slice(0, count)
      .map((c) => c.id);
  };
  const hideOnLeaderboard = (id: string) =>
    db.query('UPDATE users SET leaderboard_visible = false WHERE id = $1', [id]);

  describe('GET /community/students', () => {
    it('is for signed-in students only', async () => {
      await request(t.app.getHttpServer()).get('/community/students').expect(401);
    });

    it('lists me first, then the others by name, with what a card shows', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Zed', lastName });
      const rania = await onboardedStudent(t, ing4CimA, ['clf-c02', 'az-900'], {
        firstName: 'Rania',
        lastName,
      });
      await rania.agent.put('/me/preparations/saa-c03').expect(201);
      const [chapter] = await firstChapters('saa-c03', 1);
      await rania.agent.put(`/me/chapters/${chapter}`).expect(200);
      await onboardedStudent(t, ing4CimA, [], { firstName: 'Amira', lastName });

      const list = await directory(me.agent, { scope: 'class', q: lastName });
      expect(list.total).toBe(3);
      expect(names(list)).toEqual(['Zed', 'Amira', 'Rania']);
      expect(list.items[0]).toMatchObject({ id: me.id, isMe: true, points: 0 });
      expect(list.items[2]).toEqual({
        id: rania.id,
        firstName: 'Rania',
        lastName,
        avatarPath: null,
        classCode: 'ING-4-CIM-A',
        year: 4,
        specialty: 'CIM',
        availableToHelp: false,
        isMe: false,
        held: expect.arrayContaining([
          { code: 'CLF-C02', slug: 'clf-c02' },
          { code: 'AZ-900', slug: 'az-900' },
        ]),
        preparing: [{ code: 'SAA-C03', slug: 'saa-c03' }],
        earnedCount: 2,
        preparingCount: 1,
        level: { rank: 1, roman: 'I', name: 'Novice' },
        points: 10,
      });
      expect(list.viewer).toEqual({ classCode: 'ING-4-CIM-A', year: 4, specialty: 'CIM' });
    });

    it('narrows to my class, my specialty, my year or the whole institute', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      await onboardedStudent(t, ing4CimA, [], { firstName: 'Classmate', lastName });
      await onboardedStudent(t, ing4CimB, [], { firstName: 'Othergroup', lastName });
      await onboardedStudent(t, ing5Cim, [], { firstName: 'Senior', lastName });
      await onboardedStudent(t, ing2Cim, [], { firstName: 'Junior', lastName });
      await onboardedStudent(t, ing4Ssir, [], { firstName: 'Security', lastName });

      const seen = async (scope: string) =>
        names(await directory(me.agent, { scope, q: lastName })).sort();
      expect(await seen('class')).toEqual(['Classmate', 'Me']);
      // ING-2 students aiming for CIM are on my path too.
      expect(await seen('specialty')).toEqual([
        'Classmate',
        'Junior',
        'Me',
        'Othergroup',
        'Senior',
      ]);
      expect(await seen('year')).toEqual(['Classmate', 'Me', 'Othergroup', 'Security']);
      expect(await seen('institute')).toHaveLength(6);

      // The chips count each class specialty with the other filters applied.
      const institute = await directory(me.agent, { scope: 'institute', q: lastName });
      expect(institute.specialties).toEqual([
        { code: 'CIM', count: 4 },
        { code: 'none', count: 1 },
        { code: 'SSIR', count: 1 },
      ]);
      const ssir = await directory(me.agent, {
        scope: 'institute',
        q: lastName,
        specialty: 'SSIR',
      });
      expect(names(ssir)).toEqual(['Security']);
      // Picking a chip doesn't change the counts on the others.
      expect(ssir.specialties).toEqual(institute.specialties);
      expect(
        names(await directory(me.agent, { scope: 'institute', q: lastName, specialty: 'none' })),
      ).toEqual(['Junior']);
    });

    it('searches by name in either order, ignoring case', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      await onboardedStudent(t, ing4CimA, [], { firstName: 'Salma', lastName });

      const search = async (q: string) =>
        names(await directory(me.agent, { scope: 'institute', q })).filter((n) => n !== 'Me');
      expect(await search(`salma ${lastName.toLowerCase()}`)).toEqual(['Salma']);
      expect(await search(`${lastName.toUpperCase()} SALMA`)).toEqual(['Salma']);
      expect(await search(`${lastName} nobody`)).toEqual([]);
    });

    it('treats % and _ in a search as plain characters', async () => {
      const { agent } = await onboardedStudent(t, ing4CimA);
      expect((await directory(agent, { scope: 'institute', q: '%%' })).total).toBe(0);
      expect((await directory(agent, { scope: 'institute', q: '__' })).total).toBe(0);
    });

    it('searches by a certification held or in progress, and filters on one held', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      const holder = await onboardedStudent(t, ing4CimA, ['ccna-rs'], {
        firstName: 'Holder',
        lastName,
      });
      const starter = await onboardedStudent(t, ing4CimA, [], { firstName: 'Starter', lastName });
      await starter.agent.put('/me/preparations/ccna-rs').expect(201);

      const byCode = await directory(me.agent, { scope: 'class', q: 'ccna' });
      const found = byCode.items.map((p) => p.id);
      expect(found).toEqual(expect.arrayContaining([holder.id, starter.id]));
      expect(found).not.toContain(me.id);

      // "Holds CCNA-RS" keeps holders only; the name search then narrows to this test's students.
      const holders = await directory(me.agent, { scope: 'class', holds: 'ccna-rs', q: lastName });
      expect(names(holders)).toEqual(['Holder']);
      expect(
        (await directory(me.agent, { scope: 'class', holds: 'no-such-cert', q: lastName })).total,
      ).toBe(0);
    });

    it('filters on "available to help" once a student switches it on', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      const helper = await onboardedStudent(t, ing4CimA, [], { firstName: 'Helper', lastName });

      const query = { scope: 'class', q: lastName, help: 'true' };
      expect((await directory(me.agent, query)).total).toBe(0);
      const saved = MyProfileSettingsSchema.parse(
        (await helper.agent.patch('/me/profile').send({ availableToHelp: true }).expect(200)).body,
      );
      expect(saved).toEqual({ availableToHelp: true });
      const list = await directory(me.agent, query);
      expect(names(list)).toEqual(['Helper']);
      expect(list.items[0]?.availableToHelp).toBe(true);

      await helper.agent.patch('/me/profile').send({ availableToHelp: false }).expect(200);
      expect((await directory(me.agent, query)).total).toBe(0);
    });

    it('pages 24 at a time without repeating anyone', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      for (let i = 0; i < DIRECTORY_PAGE_SIZE + 1; i++) {
        await onboardedStudent(t, ing4CimA, [], { firstName: `Peer${i}`, lastName });
      }
      const first = await directory(me.agent, { scope: 'class', q: lastName });
      const second = await directory(me.agent, { scope: 'class', q: lastName, page: 2 });
      expect(first.total).toBe(DIRECTORY_PAGE_SIZE + 2);
      expect(first.items).toHaveLength(DIRECTORY_PAGE_SIZE);
      expect(second.items).toHaveLength(2);
      const ids = [...first.items, ...second.items].map((p) => p.id);
      expect(new Set(ids).size).toBe(DIRECTORY_PAGE_SIZE + 2);
      expect((await directory(me.agent, { scope: 'class', q: lastName, page: 9 })).items).toEqual(
        [],
      );
    });

    it('rejects a bad scope, a one-letter search and a malformed slug', async () => {
      const { agent } = await onboardedStudent(t, ing4CimA);
      await agent.get('/community/students?scope=world').expect(400);
      await agent.get('/community/students?q=a').expect(400);
      await agent.get('/community/students?holds=Not%20A%20Slug').expect(400);
      await agent.get('/community/students?page=0').expect(400);
    });
  });

  describe('privacy', () => {
    it('never lists or opens a student who has not verified or not finished onboarding', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });

      const unverifiedEmail = uniqueEmail('unverified');
      await signUpRequest(t.app.getHttpServer(), unverifiedEmail, {
        firstName: 'Unverified',
        lastName,
      }).expect(202);
      const [unverified] = await db.query<{ id: string }[]>(
        'SELECT id FROM users WHERE email = $1',
        [unverifiedEmail],
      );

      const half = await signUpAndVerify(t, uniqueEmail('half'), {
        firstName: 'Halfway',
        lastName,
      });
      await half.agent.put('/onboarding/enrolment').send(ing4CimA).expect(200);
      const halfId = ((await half.agent.get('/auth/me').expect(200)).body as { id: string }).id;

      expect(names(await directory(me.agent, { scope: 'institute', q: lastName }))).toEqual(['Me']);
      // The same 404 as an id that doesn't exist: nothing tells the two apart.
      const missing = await me.agent.get(`/community/students/${randomUUID()}`).expect(404);
      for (const id of [unverified?.id, halfId]) {
        const res = await me.agent.get(`/community/students/${id}`).expect(404);
        expect(res.body).toEqual({
          ...missing.body,
          instance: res.body.instance,
          requestId: res.body.requestId,
        });
      }
    });

    it('needs a session for every route and a valid id', async () => {
      const server = t.app.getHttpServer();
      const other = await onboardedStudent(t, ing4CimA);
      await request(server).get(`/community/students/${other.id}`).expect(401);
      await request(server).get('/me/profile').expect(401);
      await request(server).patch('/me/profile').send({ availableToHelp: true }).expect(401);
      await other.agent.get('/community/students/not-a-uuid').expect(400);
      await other.agent.patch('/me/profile').send({ availableToHelp: 'yes' }).expect(400);
    });

    it('keeps the points of a student who hides their name on the leaderboard', async () => {
      const lastName = family();
      const me = await onboardedStudent(t, ing4CimA, [], { firstName: 'Me', lastName });
      const hidden = await onboardedStudent(t, ing4CimA, [], { firstName: 'Hidden', lastName });
      await hidden.agent.put('/me/preparations/az-900').expect(201);
      for (const chapter of await firstChapters('az-900', 2)) {
        await hidden.agent.put(`/me/chapters/${chapter}`).expect(200);
      }
      await hideOnLeaderboard(hidden.id);

      const card = (await directory(me.agent, { scope: 'class', q: lastName })).items.find(
        (p) => p.id === hidden.id,
      );
      expect(card).toMatchObject({ points: null, level: { name: 'Novice' } });
      const seen = await profile(me.agent, hidden.id);
      expect(seen).toMatchObject({ points: null, privacy: null });
      expect(seen.stats.chaptersDone).toBeNull();

      // They still see their own.
      const own = await profile(hidden.agent, hidden.id);
      expect(own).toMatchObject({ points: 20, privacy: { leaderboardVisible: false } });
      expect(own.stats.chaptersDone).toBe(2);
      expect(
        (await directory(hidden.agent, { scope: 'class', q: lastName })).items[0],
      ).toMatchObject({ id: hidden.id, points: 20 });
    });

    it('never says which chapters a student ticked, nor anything from their account', async () => {
      const me = await onboardedStudent(t, ing4CimA);
      const other = await onboardedStudent(t, ing4CimA, ['clf-c02']);
      await other.agent.put('/me/preparations/saa-c03').expect(201);
      const chapters = await firstChapters('saa-c03', 2);
      for (const chapter of chapters) await other.agent.put(`/me/chapters/${chapter}`).expect(200);

      const raw = JSON.stringify([
        (await me.agent.get(`/community/students/${other.id}`).expect(200)).body,
        (await me.agent.get('/community/students?scope=class').expect(200)).body,
      ]);
      for (const chapter of chapters) expect(raw).not.toContain(chapter);
      for (const field of [
        'password',
        'role',
        'emailVerifiedAt',
        'visibilityConsentedAt',
        'onboarding',
        'avatarKey',
        'doneChapterIds',
        'leaderboardVisible',
      ]) {
        expect(raw).not.toContain(field);
      }
      // A classmate gets the percentage, not the chapter counts.
      expect((await profile(me.agent, other.id)).preparing).toEqual([
        expect.objectContaining({ slug: 'saa-c03', pct: 18, done: null, total: null }),
      ]);
    });
  });

  describe('GET /community/students/:id and /me/profile', () => {
    it('shows a classmate: collection, what they prepare, path, badges and activity', async () => {
      const me = await onboardedStudent(t, ing4CimA);
      const ons = await onboardedStudent(t, ing4CimA, ['clf-c02'], {
        firstName: 'Ons',
        lastName: 'Ben Salah',
      });
      await ons.agent.put('/me/preparations/saa-c03').expect(201);
      const [chapter] = await firstChapters('saa-c03', 1);
      await ons.agent.put(`/me/chapters/${chapter}`).expect(200);

      const seen = await profile(me.agent, ons.id);
      expect(seen).toMatchObject({
        id: ons.id,
        firstName: 'Ons',
        lastName: 'Ben Salah',
        classCode: 'ING-4-CIM-A',
        year: 4,
        specialty: { code: 'CIM' },
        targetSpecialty: null,
        email: ons.email,
        availableToHelp: false,
        isMe: false,
        level: { rank: 1, roman: 'I', name: 'Novice' },
        points: 10,
        stats: { unverified: 1, preparing: 1, chaptersDone: 1, badges: 1 },
        privacy: null,
      });
      expect(seen.collection).toEqual([
        expect.objectContaining({ slug: 'clf-c02', code: 'CLF-C02', status: 'unverified' }),
      ]);
      expect(seen.preparing).toEqual([expect.objectContaining({ slug: 'saa-c03', pct: 9 })]);
      expect(seen.path).toMatchObject({ code: 'CIM', kind: 'specialty', heldCount: 1 });
      expect(seen.path?.total).toBeGreaterThan(1);
      expect(seen.badges.find((b) => b.key === 'first_step')?.earnedAt).toEqual(expect.any(String));
      expect(seen.activity.map((a) => a.kind).sort()).toEqual([
        'badge_earned',
        'certification_started',
        'chapters_done',
      ]);
    });

    it('shows my own profile with chapter counts and my privacy choices', async () => {
      const me = await onboardedStudent(t, ing4CimA);
      await me.agent.put('/me/preparations/az-900').expect(201);
      const [chapter] = await firstChapters('az-900', 1);
      await me.agent.put(`/me/chapters/${chapter}`).expect(200);

      const own = StudentProfileSchema.parse((await me.agent.get('/me/profile').expect(200)).body);
      expect(own).toMatchObject({
        id: me.id,
        isMe: true,
        email: me.email,
        points: 10,
        privacy: { leaderboardVisible: true },
      });
      expect(own.preparing[0]).toMatchObject({ slug: 'az-900', done: 1 });
      expect(own.preparing[0]?.total).toBeGreaterThan(1);
      // The same answer by id.
      expect(await profile(me.agent, me.id)).toEqual(own);
    });

    it('shows the target specialty and its path for an ING-2 student', async () => {
      const me = await onboardedStudent(t, ing4CimA);
      const junior = await onboardedStudent(t, ing2Cim);
      const undecided = await onboardedStudent(t, { year: 1, targetSpecialty: null, group: 'A' });

      expect(await profile(me.agent, junior.id)).toMatchObject({
        classCode: 'ING-2-B',
        specialty: null,
        targetSpecialty: { code: 'CIM' },
        path: { code: 'CIM', kind: 'target', heldCount: 0 },
      });
      expect(await profile(me.agent, undecided.id)).toMatchObject({
        specialty: null,
        targetSpecialty: null,
        path: { code: 'FOND', kind: 'fundamentals' },
      });
    });
  });
});
