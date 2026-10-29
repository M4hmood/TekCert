import {
  CurrentUserSchema,
  ONBOARDING_PROBLEM,
  OnboardingStateSchema,
  RecommendedPathSchema,
} from '@tekcert/types';
import { createTestApp, signUpAndVerify, type TestApp, uniqueEmail } from './test-app';

describe('Onboarding (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  const student = (names: { firstName?: string; lastName?: string } = {}) =>
    signUpAndVerify(t, uniqueEmail('onboarding'), names);

  it('starts at step 1 with the specialty options and their path previews', async () => {
    const { agent } = await student();
    const res = await agent.get('/onboarding').expect(200);
    const state = OnboardingStateSchema.parse(res.body);
    expect(state).toMatchObject({
      step: 1,
      completed: false,
      firstName: 'Yassine',
      enrolment: null,
      certificationSlugs: [],
      leaderboardVisible: true,
      avatarPath: null,
    });
    expect(state.specialties.map((s) => s.code)).toEqual([
      'SDIA',
      'CIM',
      'GLOps',
      'SSIR',
      'AIOT',
      'DMWM',
    ]);
    expect(state.specialties[1]?.pathPreview).toEqual(['CLF-C02', 'SAA-C03', 'SOA-C03']);
  });

  it('needs the class before the later steps', async () => {
    const { agent } = await student();
    for (const call of [
      () => agent.put('/onboarding/certifications').send({ slugs: [] }),
      () => agent.put('/onboarding/privacy').send({ leaderboardVisible: false }),
      () => agent.post('/onboarding/complete'),
      () => agent.get('/me/recommended-path'),
    ]) {
      const res = await call().expect(409);
      expect(res.body.type).toBe(ONBOARDING_PROBLEM.enrolmentRequired);
    }
  });

  it('onboards an ING-4 CIM student onto the CIM path', async () => {
    const { agent } = await student();

    const enrolled = await agent
      .put('/onboarding/enrolment')
      .send({ year: 4, specialty: 'CIM', group: 'C' })
      .expect(200);
    expect(OnboardingStateSchema.parse(enrolled.body)).toMatchObject({
      step: 3,
      enrolment: {
        year: 4,
        group: 'C',
        specialty: 'CIM',
        targetSpecialty: null,
        classCode: 'ING-4-CIM-C',
      },
    });
    expect(enrolled.body.enrolment.classmates).toBeGreaterThanOrEqual(1);

    const picked = await agent
      .put('/onboarding/certifications')
      .send({ slugs: ['clf-c02', 'az-900'] })
      .expect(200);
    expect(picked.body).toMatchObject({ step: 4, certificationSlugs: ['clf-c02', 'az-900'] });

    const privacy = await agent
      .put('/onboarding/privacy')
      .send({ leaderboardVisible: false })
      .expect(200);
    expect(privacy.body).toMatchObject({ step: 5, leaderboardVisible: false, completed: false });

    const path = RecommendedPathSchema.parse(
      (await agent.get('/me/recommended-path').expect(200)).body,
    );
    expect(path.path).toEqual({
      code: 'CIM',
      name: 'Cloud Infrastructure Management',
      hue: 225,
    });
    expect(path.reason).toBe('specialty');
    expect(path.certificationCount).toBe(9);
    expect(path.track.map((n) => `${n.code}:${n.state}`)).toEqual([
      'CLF-C02:held',
      'SAA-C03:next',
      'SOA-C03:locked',
    ]);

    // Not finished until "Go to my dashboard".
    expect((await agent.get('/auth/me').expect(200)).body.onboardingCompleted).toBe(false);
    const done = await agent.post('/onboarding/complete').expect(200);
    expect(done.body).toMatchObject({ completed: true, step: 5 });

    const me = CurrentUserSchema.parse((await agent.get('/auth/me').expect(200)).body);
    expect(me).toMatchObject({ classCode: 'ING-4-CIM-C', onboardingCompleted: true });
  });

  it('gives an undecided ING-2 student the Fundamentals path', async () => {
    const { agent } = await student();
    const enrolled = await agent
      .put('/onboarding/enrolment')
      .send({ year: 2, targetSpecialty: null, group: 'B' })
      .expect(200);
    expect(enrolled.body.enrolment).toMatchObject({
      classCode: 'ING-2-B',
      specialty: null,
      targetSpecialty: null,
    });

    const path = RecommendedPathSchema.parse(
      (await agent.get('/me/recommended-path').expect(200)).body,
    );
    expect(path).toMatchObject({ path: { code: 'FOND', hue: null }, reason: 'undecided' });
    expect(path.track[0]?.state).toBe('next');
  });

  it('suggests the target specialty’s path in ING-1…3 and counts the peers on it', async () => {
    const first = await student({ firstName: 'Salma', lastName: 'Bouzid' });
    await first.agent
      .put('/onboarding/enrolment')
      .send({ year: 5, specialty: 'AIOT', group: 'A' })
      .expect(200);
    await first.agent.post('/onboarding/complete').expect(200);

    const { agent } = await student();
    await agent
      .put('/onboarding/enrolment')
      .send({ year: 3, targetSpecialty: 'AIOT', group: 'D' })
      .expect(200);
    const path = RecommendedPathSchema.parse(
      (await agent.get('/me/recommended-path').expect(200)).body,
    );
    expect(path).toMatchObject({ path: { code: 'AIOT' }, reason: 'target' });
    // Salma (ING-5 AIOT) follows the same path and finished onboarding most recently.
    expect(path.peers.count).toBeGreaterThanOrEqual(1);
    expect(path.peers.initials[0]).toBe('SB');
  });

  it('keeps the furthest step when the student goes back and saves again', async () => {
    const { agent } = await student();
    await agent.put('/onboarding/enrolment').send({ year: 4, specialty: 'CIM', group: 'A' });
    await agent.put('/onboarding/certifications').send({ slugs: [] }).expect(200);
    const again = await agent
      .put('/onboarding/enrolment')
      .send({ year: 4, specialty: 'SSIR', group: 'B' })
      .expect(200);
    expect(again.body).toMatchObject({ step: 4, enrolment: { classCode: 'ING-4-SSIR-B' } });
  });

  it('replaces the declared certifications and ignores duplicates', async () => {
    const { agent } = await student();
    await agent.put('/onboarding/enrolment').send({ year: 1, targetSpecialty: 'CIM', group: 'A' });
    await agent
      .put('/onboarding/certifications')
      .send({ slugs: ['pcep', 'pcep', 'clf-c02'] })
      .expect(200);
    const replaced = await agent
      .put('/onboarding/certifications')
      .send({ slugs: ['az-900'] })
      .expect(200);
    expect(replaced.body.certificationSlugs).toEqual(['az-900']);
    const cleared = await agent.put('/onboarding/certifications').send({ slugs: [] }).expect(200);
    expect(cleared.body.certificationSlugs).toEqual([]);
  });

  it('refuses certifications outside the catalog', async () => {
    const { agent } = await student();
    await agent.put('/onboarding/enrolment').send({ year: 4, specialty: 'CIM', group: 'A' });
    const res = await agent
      .put('/onboarding/certifications')
      .send({ slugs: ['clf-c02', 'google-cdl'] })
      .expect(422);
    expect(res.body).toMatchObject({
      type: ONBOARDING_PROBLEM.unknownCertification,
      detail: 'Not in the catalog: google-cdl.',
    });
  });

  it.each([
    { year: 4, targetSpecialty: 'CIM', group: 'A' },
    { year: 2, specialty: 'CIM', group: 'A' },
    { year: 4, specialty: 'CIM', group: 'G' },
    { year: 7, specialty: 'CIM', group: 'A' },
  ])('validates the enrolment %o', async (body) => {
    const { agent } = await student();
    await agent.put('/onboarding/enrolment').send(body).expect(400);
  });

  it('needs a session', async () => {
    const { agent } = await student();
    await agent.post('/auth/sign-out').expect(204);
    await agent.get('/onboarding').expect(401);
    await agent.get('/me/recommended-path').expect(401);
  });
});
