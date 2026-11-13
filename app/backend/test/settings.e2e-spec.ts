import {
  CertificationDetailSchema,
  CurrentUserSchema,
  ONBOARDING_PROBLEM,
  type Settings,
  SETTINGS_PROBLEM,
  SettingsSchema,
  StudentLeaderboardSchema,
  StudentProfileSchema,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  onboardedStudent,
  PASSWORD,
  signUpAndVerify,
  type TestApp,
  travelTo,
} from './test-app';

type Agent = ReturnType<typeof request.agent>;

/**
 * Students here belong to AIOT classes, which no other suite counts: the leaderboard and
 * community suites assert exact totals on their own classes and specialties.
 */
describe('Settings (e2e)', () => {
  let t: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterEach(() => {
    t.clock.reset();
  });

  afterAll(async () => {
    await t.app.close();
  });

  const settings = async (agent: Agent): Promise<Settings> =>
    SettingsSchema.parse((await agent.get('/me/settings').expect(200)).body);
  const me = async (agent: Agent) =>
    CurrentUserSchema.parse((await agent.get('/auth/me').expect(200)).body);
  const answer = (agent: Agent, body: Record<string, unknown>) =>
    agent.post('/me/academic-year').send(body);
  /** 1 September of next year at noon in Tunis: the first day of the next academic year. */
  const nextSeptember = () => {
    const now = new Date();
    const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    return new Date(`${year}-09-01T12:00:00+01:00`);
  };

  it('is for signed-in students only', async () => {
    const server = t.app.getHttpServer();
    await request(server).get('/me/settings').expect(401);
    await request(server).get('/me/export.csv').expect(401);
    await request(server).patch('/me/account').send({ firstName: 'A', lastName: 'B' }).expect(401);
    await request(server).patch('/me/preferences').send({ theme: 'dark' }).expect(401);
    await request(server)
      .put('/me/enrolment')
      .send({ year: 4, specialty: 'CIM', group: 'A' })
      .expect(401);
    await request(server).post('/me/academic-year').send({ status: 'repeating' }).expect(401);
  });

  it('returns my account, class, privacy choices, theme and the academic year', async () => {
    const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' }, [], {
      firstName: 'Yassine',
      lastName: 'Ben Amor',
    });
    const mine = await settings(s.agent);
    expect(mine).toMatchObject({
      account: { firstName: 'Yassine', lastName: 'Ben Amor', email: s.email },
      enrolment: { year: 4, group: 'D', specialty: 'AIOT', classCode: 'ING-4-AIOT-D' },
      alumni: false,
      privacy: { leaderboardVisible: true, availableToHelp: false },
      theme: null,
      academicYear: { due: false },
    });
    expect(mine.academicYear.label).toBe(
      `${mine.academicYear.year}-${String((mine.academicYear.year + 1) % 100).padStart(2, '0')}`,
    );
    expect(mine.specialties.map((specialty) => specialty.code)).toEqual([
      'SDIA',
      'CIM',
      'GLOps',
      'SSIR',
      'AIOT',
      'DMWM',
    ]);
  });

  describe('PATCH /me/account', () => {
    it('changes my name everywhere it shows', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      const saved = SettingsSchema.parse(
        (
          await s.agent
            .patch('/me/account')
            .send({ firstName: '  Yasmine ', lastName: 'Trabelsi' })
            .expect(200)
        ).body,
      );
      expect(saved.account).toMatchObject({ firstName: 'Yasmine', lastName: 'Trabelsi' });
      expect(await me(s.agent)).toMatchObject({ firstName: 'Yasmine', lastName: 'Trabelsi' });
      const profile = StudentProfileSchema.parse(
        (await s.agent.get('/me/profile').expect(200)).body,
      );
      expect(profile).toMatchObject({ firstName: 'Yasmine', lastName: 'Trabelsi' });
    });

    it('refuses an empty or oversized name, and never changes the email', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      await s.agent.patch('/me/account').send({ firstName: ' ', lastName: 'Trabelsi' }).expect(400);
      await s.agent
        .patch('/me/account')
        .send({ firstName: 'A'.repeat(81), lastName: 'Trabelsi' })
        .expect(400);
      await s.agent.patch('/me/account').send({ firstName: 'Yasmine' }).expect(400);
      await s.agent
        .patch('/me/account')
        .send({ firstName: 'Yasmine', lastName: 'Trabelsi', email: 'someone.else@tek-up.de' })
        .expect(200);
      expect((await settings(s.agent)).account.email).toBe(s.email);
    });
  });

  describe('PATCH /me/preferences', () => {
    it('keeps my theme on my account, so another device gets it', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      // Nothing chosen yet: the browser's own setting applies.
      expect((await me(s.agent)).theme).toBeNull();
      const saved = SettingsSchema.parse(
        (await s.agent.patch('/me/preferences').send({ theme: 'dark' }).expect(200)).body,
      );
      expect(saved.theme).toBe('dark');

      // A second browser signing in to the same account.
      const elsewhere = request.agent(t.app.getHttpServer());
      const signedIn = await elsewhere
        .post('/auth/sign-in')
        .send({ email: s.email, password: PASSWORD })
        .expect(200);
      expect(CurrentUserSchema.parse(signedIn.body).theme).toBe('dark');
      expect((await me(elsewhere)).theme).toBe('dark');

      await s.agent.patch('/me/preferences').send({ theme: 'sepia' }).expect(400);
      await s.agent.patch('/me/preferences').send({ theme: 'system' }).expect(200);
      expect((await me(elsewhere)).theme).toBe('system');
    });
  });

  describe('PUT /me/enrolment', () => {
    it('moves me to the new class on the leaderboards and keeps my ledger', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      await s.agent.put('/me/preparations/az-900').expect(201);
      const detail = CertificationDetailSchema.parse(
        (await request(t.app.getHttpServer()).get('/certifications/az-900').expect(200)).body,
      );
      await s.agent.put(`/me/chapters/${detail.domains[0]?.chapters[0]?.id ?? ''}`).expect(200);
      const ledgerBefore = await db.query<unknown[]>(
        'SELECT id, delta FROM point_events WHERE user_id = $1',
        [s.id],
      );

      const saved = SettingsSchema.parse(
        (
          await s.agent
            .put('/me/enrolment')
            .send({ year: 5, specialty: 'AIOT', group: 'A' })
            .expect(200)
        ).body,
      );
      expect(saved.enrolment).toMatchObject({
        year: 5,
        group: 'A',
        specialty: 'AIOT',
        targetSpecialty: null,
        classCode: 'ING-5-AIOT-A',
      });
      expect((await me(s.agent)).classCode).toBe('ING-5-AIOT-A');

      const board = StudentLeaderboardSchema.parse(
        (await s.agent.get('/leaderboard/students?scope=class&period=all').expect(200)).body,
      );
      expect(board.viewer).toEqual({ classCode: 'ING-5-AIOT-A', year: 5, specialty: 'AIOT' });
      expect(board.me).toMatchObject({ points: 10 });
      expect(
        await db.query('SELECT id, delta FROM point_events WHERE user_id = $1', [s.id]),
      ).toEqual(ledgerBefore);
    });

    it('records the specialty aimed for in ING-1 to 3', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      const saved = SettingsSchema.parse(
        (
          await s.agent
            .put('/me/enrolment')
            .send({ year: 2, targetSpecialty: 'AIOT', group: 'A' })
            .expect(200)
        ).body,
      );
      expect(saved.enrolment).toMatchObject({
        year: 2,
        specialty: null,
        targetSpecialty: 'AIOT',
        classCode: 'ING-2-A',
      });
    });

    it('refuses an invalid class, and a student who hasn’t finished onboarding', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'D' });
      await s.agent.put('/me/enrolment').send({ year: 4, group: 'A' }).expect(400);
      await s.agent
        .put('/me/enrolment')
        .send({ year: 7, specialty: 'CIM', group: 'A' })
        .expect(400);
      await s.agent
        .put('/me/enrolment')
        .send({ year: 4, specialty: 'CIM', group: 'Z' })
        .expect(400);
      expect((await settings(s.agent)).enrolment?.classCode).toBe('ING-4-AIOT-D');

      const fresh = await signUpAndVerify(t);
      const refused = await fresh.agent
        .put('/me/enrolment')
        .send({ year: 4, specialty: 'CIM', group: 'A' })
        .expect(409);
      expect(refused.body).toMatchObject({ type: ONBOARDING_PROBLEM.enrolmentRequired });
      await answer(fresh.agent, { status: 'repeating' }).expect(409);
    });
  });

  describe('the new academic year', () => {
    it('is due from 1 September, for students who finished onboarding', async () => {
      const s = await onboardedStudent(t, { year: 2, targetSpecialty: 'AIOT', group: 'D' });
      const fresh = await signUpAndVerify(t);
      expect((await me(s.agent)).yearPromptDue).toBe(false);

      await travelTo(t, new Date(nextSeptember().getTime() - 2 * 86_400_000), s);
      expect((await me(s.agent)).yearPromptDue).toBe(false);

      await travelTo(t, nextSeptember(), s, fresh);
      expect((await me(s.agent)).yearPromptDue).toBe(true);
      expect((await settings(s.agent)).academicYear.due).toBe(true);
      // Still in onboarding: the wizard asks for the year, not the prompt.
      expect((await me(fresh.agent)).yearPromptDue).toBe(false);
    });

    it('moves me up once, keeping the specialty I aim for', async () => {
      const s = await onboardedStudent(t, { year: 2, targetSpecialty: 'AIOT', group: 'D' });
      await travelTo(t, nextSeptember(), s);

      const moved = SettingsSchema.parse(
        (await answer(s.agent, { status: 'moving_up', group: 'B' }).expect(200)).body,
      );
      expect(moved.enrolment).toMatchObject({
        year: 3,
        group: 'B',
        targetSpecialty: 'AIOT',
        classCode: 'ING-3-B',
      });
      expect(moved.academicYear.due).toBe(false);
      expect((await me(s.agent)).yearPromptDue).toBe(false);

      // A second click, or a second tab, must not move me up twice.
      const again = await answer(s.agent, { status: 'moving_up', group: 'B' }).expect(409);
      expect(again.body).toMatchObject({ type: SETTINGS_PROBLEM.yearAlreadyConfirmed });
      expect((await settings(s.agent)).enrolment?.year).toBe(3);
    });

    it('asks for a specialty when moving up to ING-4', async () => {
      const undecided = await onboardedStudent(t, { year: 3, targetSpecialty: null, group: 'A' });
      const decided = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await travelTo(t, nextSeptember(), undecided, decided);

      const refused = await answer(undecided.agent, { status: 'moving_up', group: 'A' }).expect(
        422,
      );
      expect(refused.body).toMatchObject({ type: SETTINGS_PROBLEM.specialtyRequired });
      expect((await me(undecided.agent)).yearPromptDue).toBe(true);
      const chosen = SettingsSchema.parse(
        (
          await answer(undecided.agent, {
            status: 'moving_up',
            group: 'B',
            specialty: 'AIOT',
          }).expect(200)
        ).body,
      );
      expect(chosen.enrolment).toMatchObject({
        year: 4,
        specialty: 'AIOT',
        classCode: 'ING-4-AIOT-B',
      });

      // The specialty aimed for is the default.
      const kept = SettingsSchema.parse(
        (await answer(decided.agent, { status: 'moving_up', group: 'C' }).expect(200)).body,
      );
      expect(kept.enrolment).toMatchObject({
        year: 4,
        specialty: 'AIOT',
        classCode: 'ING-4-AIOT-C',
      });
    });

    it('keeps my class when I repeat the year', async () => {
      const s = await onboardedStudent(t, { year: 4, specialty: 'AIOT', group: 'C' });
      await travelTo(t, nextSeptember(), s);
      const same = SettingsSchema.parse(
        (await answer(s.agent, { status: 'repeating' }).expect(200)).body,
      );
      expect(same.enrolment?.classCode).toBe('ING-4-AIOT-C');
      expect(same.academicYear.due).toBe(false);
      expect(same.alumni).toBe(false);
    });

    it('has no year after ING-5', async () => {
      const s = await onboardedStudent(t, { year: 5, specialty: 'AIOT', group: 'C' });
      await travelTo(t, nextSeptember(), s);
      const refused = await answer(s.agent, { status: 'moving_up', group: 'A' }).expect(422);
      expect(refused.body).toMatchObject({ type: SETTINGS_PROBLEM.finalYear });
      await answer(s.agent, { status: 'moving_up' }).expect(400);
      await answer(s.agent, { status: 'graduated' }).expect(400);
    });

    it('switches me to alumni mode when I leave, until I save a class again', async () => {
      const klass = { year: 4, specialty: 'AIOT', group: 'A' };
      const s = await onboardedStudent(t, klass, [], { firstName: 'Leila' });
      const classmate = await onboardedStudent(t, klass);
      const board = async (agent: Agent) =>
        StudentLeaderboardSchema.parse(
          (await agent.get('/leaderboard/students?scope=class&period=all').expect(200)).body,
        );
      expect((await board(classmate.agent)).total).toBe(2);
      await travelTo(t, nextSeptember(), s, classmate);

      const left = SettingsSchema.parse(
        (await answer(s.agent, { status: 'left' }).expect(200)).body,
      );
      expect(left.alumni).toBe(true);
      expect(left.academicYear.due).toBe(false);
      // The last class is kept, for the profile.
      expect(left.enrolment?.classCode).toBe('ING-4-AIOT-A');
      expect(await me(s.agent)).toMatchObject({ alumni: true, yearPromptDue: false });

      // Off the leaderboards, still a profile classmates can open.
      const after = await board(classmate.agent);
      expect(after.total).toBe(1);
      expect(after.rows.map((row) => row.person?.id)).not.toContain(s.id);
      expect((await board(s.agent)).me).toBeNull();
      const profile = StudentProfileSchema.parse(
        (await classmate.agent.get(`/community/students/${s.id}`).expect(200)).body,
      );
      expect(profile).toMatchObject({ firstName: 'Leila', alumni: true });

      // Never asked again, even a year later.
      await travelTo(t, new Date(nextSeptember().getTime() + 366 * 86_400_000), s, classmate);
      expect((await me(s.agent)).yearPromptDue).toBe(false);

      // Saving a class in Settings ends alumni mode.
      const back = SettingsSchema.parse(
        (await s.agent.put('/me/enrolment').send(klass).expect(200)).body,
      );
      expect(back.alumni).toBe(false);
      expect((await board(classmate.agent)).total).toBe(2);
    });
  });

  describe('GET /me/export.csv', () => {
    it('exports my certifications, chapters and ledger, and nobody else’s', async () => {
      const klass = { year: 4, specialty: 'AIOT', group: 'B' };
      const s = await onboardedStudent(t, klass, ['clf-c02'], {
        firstName: 'Yassine',
        lastName: 'Ben Amor',
      });
      const other = await onboardedStudent(t, klass, [], {
        firstName: 'Someone',
        lastName: 'Else',
      });
      const detail = CertificationDetailSchema.parse(
        (await request(t.app.getHttpServer()).get('/certifications/az-900').expect(200)).body,
      );
      const chapters = detail.domains.flatMap((domain) => domain.chapters);
      for (const student of [s, other]) {
        await student.agent.put('/me/preparations/az-900').expect(201);
        await student.agent.put(`/me/chapters/${chapters[0]?.id ?? ''}`).expect(200);
      }
      await s.agent.put(`/me/chapters/${chapters[1]?.id ?? ''}`).expect(200);
      await s.agent.delete(`/me/chapters/${chapters[1]?.id ?? ''}`).expect(200);

      const res = await s.agent.get('/me/export.csv').expect(200);
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toBe('attachment; filename="tekcert-export.csv"');
      expect(res.headers['cache-control']).toBe('no-store');

      const csv = res.text.replace(/^\uFEFF/, '');
      const rows = csv.trimEnd().split('\r\n');
      expect(rows[0]).toBe('record,code,name,status,points,date');
      expect(rows[1]).toContain(`profile,${s.email},Yassine Ben Amor,ING-4-AIOT-B,10,`);
      expect(rows.filter((row) => row.startsWith('certification,CLF-C02,'))).toHaveLength(1);
      expect(rows.find((row) => row.startsWith('certification,AZ-900,'))).toContain(
        `in progress · 1 of ${chapters.length} chapters`,
      );
      expect(rows.filter((row) => row.startsWith('chapter,AZ-900,'))).toHaveLength(1);

      // The points rows are the ledger, line by line: they add up to SUM(delta).
      const pointRows = rows.filter((row) => row.startsWith('points,'));
      expect(pointRows).toHaveLength(3);
      const exported = pointRows.reduce((sum, row) => sum + Number(row.split(',').at(-2)), 0);
      const [ledger] = await db.query<{ total: number }[]>(
        'SELECT COALESCE(SUM(delta), 0)::int AS total FROM point_events WHERE user_id = $1',
        [s.id],
      );
      expect(exported).toBe(ledger?.total);
      expect(exported).toBe(10);

      expect(csv).not.toContain(other.email);
      expect(csv).not.toContain('Someone');
    });
  });
});
