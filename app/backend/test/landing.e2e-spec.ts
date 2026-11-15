import { PUBLIC_STATS_MAX_AGE, type PublicStats, PublicStatsSchema } from '@tekcert/types';
import request from 'supertest';
import { LandingService } from '../src/landing/landing.service';
import { createTestApp, onboardedStudent, signUpAndVerify, type TestApp } from './test-app';

/**
 * The public numbers of the landing page. Other suites add students to the same database, so
 * the tests compare the numbers before and after their own students.
 */
describe('Landing statistics (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  /** The numbers as computed now, not as cached a moment ago. */
  const fresh = async (): Promise<PublicStats> => {
    t.app.get(LandingService).forget();
    return PublicStatsSchema.parse(
      (await request(t.app.getHttpServer()).get('/stats/public').expect(200)).body,
    );
  };
  const specialty = (stats: PublicStats, code: string) =>
    stats.bySpecialty.find((item) => item.code === code)?.preparing ?? -1;
  const path = (stats: PublicStats, code: string) =>
    stats.paths.find((item) => item.code === code)?.students ?? -1;

  it('is public and may be cached', async () => {
    const res = await request(t.app.getHttpServer()).get('/stats/public').expect(200);
    expect(res.headers['cache-control']).toBe(`public, max-age=${PUBLIC_STATS_MAX_AGE}`);
    const stats = PublicStatsSchema.parse(res.body);
    expect(stats).toMatchObject({ certifications: 56, providers: 10 });
    expect(stats.bySpecialty.map((item) => item.code)).toEqual([
      'SDIA',
      'CIM',
      'GLOps',
      'SSIR',
      'AIOT',
      'DMWM',
    ]);
    // Fundamentals first, then one path per specialty, each with a track of real codes.
    expect(stats.paths.map((item) => item.code)).toEqual([
      'FOND',
      'SDIA',
      'CIM',
      'GLOps',
      'SSIR',
      'AIOT',
      'DMWM',
    ]);
    expect(stats.paths[0]).toMatchObject({ name: 'Fundamentals', hue: null });
    for (const item of stats.paths) {
      expect(item.certifications).toBeGreaterThan(0);
      expect(item.track.length).toBeGreaterThan(0);
    }
  });

  it('counts students once they finished onboarding, and those preparing', async () => {
    const before = await fresh();
    // Verified but still in onboarding: not a student of the app yet.
    await signUpAndVerify(t);
    expect((await fresh()).students).toBe(before.students);

    const senior = await onboardedStudent(t, { year: 5, specialty: 'AIOT', group: 'A' });
    const junior = await onboardedStudent(t, { year: 2, targetSpecialty: 'AIOT', group: 'A' });
    const undecided = await onboardedStudent(t, { year: 1, targetSpecialty: null, group: 'B' });
    const joined = await fresh();
    expect(joined.students).toBe(before.students + 3);
    expect(joined.preparing).toBe(before.preparing);
    // ING-1 to 3 count for the specialty they aim for; the undecided follow Fundamentals.
    expect(path(joined, 'AIOT')).toBe(path(before, 'AIOT') + 2);
    expect(path(joined, 'FOND')).toBe(path(before, 'FOND') + 1);

    await senior.agent.put('/me/preparations/az-900').expect(201);
    await junior.agent.put('/me/preparations/az-900').expect(201);
    await junior.agent.put('/me/preparations/clf-c02').expect(201);
    await undecided.agent.put('/me/preparations/az-900').expect(201);
    const started = await fresh();
    // A student preparing two certifications is one student preparing.
    expect(started.preparing).toBe(before.preparing + 3);
    expect(specialty(started, 'AIOT')).toBe(specialty(before, 'AIOT') + 2);
    expect(specialty(started, 'CIM')).toBe(specialty(before, 'CIM'));
  });

  it('leaves alumni out', async () => {
    const student = await onboardedStudent(t, { year: 5, specialty: 'AIOT', group: 'A' });
    await student.agent.put('/me/preparations/az-900').expect(201);
    const before = await fresh();
    await student.agent.post('/me/academic-year').send({ status: 'left' }).expect(200);
    const after = await fresh();
    expect(after.students).toBe(before.students - 1);
    expect(after.preparing).toBe(before.preparing - 1);
    expect(path(after, 'AIOT')).toBe(path(before, 'AIOT') - 1);
  });

  it('says nothing about any one student', async () => {
    const student = await onboardedStudent(t, { year: 5, specialty: 'AIOT', group: 'A' }, [], {
      firstName: 'Zineddine',
      lastName: 'Unmistakable',
    });
    const body = JSON.stringify(await fresh());
    expect(body).not.toContain(student.id);
    expect(body).not.toContain(student.email);
    expect(body).not.toContain('Zineddine');
    expect(body).not.toContain('Unmistakable');
  });

  it('answers from memory for a few minutes, then counts again', async () => {
    const before = await fresh();
    await onboardedStudent(t, { year: 5, specialty: 'AIOT', group: 'A' });
    const read = async () =>
      PublicStatsSchema.parse(
        (await request(t.app.getHttpServer()).get('/stats/public').expect(200)).body,
      );
    expect((await read()).students).toBe(before.students);

    t.clock.advanceMinutes(PUBLIC_STATS_MAX_AGE / 60 + 1);
    expect((await read()).students).toBe(before.students + 1);
    t.clock.reset();
  });
});
