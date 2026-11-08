import {
  CERTIFICATION_PROBLEM,
  CertificationCommunitySchema,
  CertificationDetailSchema,
  MyCertificationSchema,
  MyCertificationsSchema,
} from '@tekcert/types';
import request from 'supertest';
import {
  createTestApp,
  onboardedStudent,
  signUpAndVerify,
  type TestApp,
  uniqueEmail,
} from './test-app';

describe('Certification page (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  const ing4Cim = { year: 4, specialty: 'CIM', group: 'A' };
  const community = async (agent: ReturnType<typeof request.agent>, slug: string, query = '') =>
    CertificationCommunitySchema.parse(
      (await agent.get(`/certifications/${slug}/community${query}`).expect(200)).body,
    );
  const ids = (list: { items: { id: string }[] }) => list.items.map((p) => p.id);

  describe('PUT /me/preparations/:slug', () => {
    it('starts a certification once: 201, then 200 with the same date', async () => {
      const { agent } = await onboardedStudent(t, ing4Cim);
      const first = MyCertificationSchema.parse(
        (await agent.put('/me/preparations/az-104').expect(201)).body,
      );
      expect(first).toMatchObject({ slug: 'az-104', status: 'in_progress' });
      const again = MyCertificationSchema.parse(
        (await agent.put('/me/preparations/az-104').expect(200)).body,
      );
      expect(again.since).toBe(first.since);
    });

    it('refuses a certification the student already holds', async () => {
      const { agent } = await onboardedStudent(t, ing4Cim, ['clf-c02']);
      const res = await agent.put('/me/preparations/clf-c02').expect(409);
      expect(res.body.type).toBe(CERTIFICATION_PROBLEM.alreadyHeld);
    });

    it('returns 404 for an unknown certification and 401 for a visitor', async () => {
      const { agent } = await onboardedStudent(t, ing4Cim);
      await agent.put('/me/preparations/not-a-cert').expect(404);
      await request(t.app.getHttpServer()).put('/me/preparations/az-104').expect(401);
    });

    it('counts the student among those preparing it', async () => {
      const preparing = async () =>
        CertificationDetailSchema.parse(
          (await request(t.app.getHttpServer()).get('/certifications/lfcs').expect(200)).body,
        ).preparingCount;
      const before = await preparing();
      const { agent } = await onboardedStudent(t, ing4Cim);
      await agent.put('/me/preparations/lfcs').expect(201);
      expect(await preparing()).toBe(before + 1);
    });
  });

  describe('GET /me/certifications', () => {
    it('lists held certifications as unverified and started ones as in progress', async () => {
      const { agent } = await onboardedStudent(t, ing4Cim, ['clf-c02']);
      await agent.put('/me/preparations/saa-c03').expect(201);
      const mine = MyCertificationsSchema.parse(
        (await agent.get('/me/certifications').expect(200)).body,
      );
      expect(mine.items.map(({ slug, status }) => ({ slug, status }))).toEqual([
        { slug: 'clf-c02', status: 'unverified' },
        { slug: 'saa-c03', status: 'in_progress' },
      ]);
    });

    it('is empty for a new student and private to visitors', async () => {
      const { agent } = await onboardedStudent(t, ing4Cim);
      expect((await agent.get('/me/certifications').expect(200)).body).toEqual({ items: [] });
      await request(t.app.getHttpServer()).get('/me/certifications').expect(401);
    });
  });

  describe('GET /certifications/:slug/community', () => {
    it('is for signed-in students only', async () => {
      await request(t.app.getHttpServer()).get('/certifications/saa-c03/community').expect(401);
    });

    it('lists holders under "earned" and starters under "preparing", never the viewer', async () => {
      const holder = await onboardedStudent(t, ing4Cim, ['pcep'], { lastName: 'Holder' });
      const starter = await onboardedStudent(t, ing4Cim, [], { lastName: 'Starter' });
      await starter.agent.put('/me/preparations/pcep').expect(201);

      const seenByStarter = await community(starter.agent, 'pcep');
      expect(ids(seenByStarter.earned)).toContain(holder.id);
      expect(ids(seenByStarter.preparing)).not.toContain(starter.id);

      const viewer = await onboardedStudent(t, ing4Cim);
      const seen = await community(viewer.agent, 'pcep');
      expect(ids(seen.preparing)).toContain(starter.id);
      expect(seen.earned.items.find((p) => p.id === holder.id)).toEqual({
        id: holder.id,
        firstName: 'Yassine',
        lastName: 'Holder',
        avatarPath: null,
        classCode: 'ING-4-CIM-A',
        year: 4,
        specialty: 'CIM',
        email: holder.email,
        since: expect.any(String),
      });
    });

    it('leaves out students who have not finished onboarding', async () => {
      const { agent } = await signUpAndVerify(t, uniqueEmail('unfinished'));
      await agent.put('/onboarding/enrolment').send(ing4Cim).expect(200);
      await agent
        .put('/onboarding/certifications')
        .send({ slugs: ['pcap'] })
        .expect(200);
      const me = await agent.get('/auth/me').expect(200);

      const viewer = await onboardedStudent(t, ing4Cim);
      expect(ids((await community(viewer.agent, 'pcap')).earned)).not.toContain(me.body.id);
    });

    it('narrows to my class, my specialty and my level', async () => {
      const ssir5D = { year: 5, specialty: 'SSIR', group: 'D' };
      const classmate = await onboardedStudent(t, ssir5D, ['cnd']);
      const sameSpecialty = await onboardedStudent(t, { year: 4, specialty: 'SSIR', group: 'B' }, [
        'cnd',
      ]);
      const aimingForSsir = await onboardedStudent(
        t,
        { year: 2, targetSpecialty: 'SSIR', group: 'C' },
        ['cnd'],
      );
      const viewer = await onboardedStudent(t, ssir5D);

      const byClass = ids((await community(viewer.agent, 'cnd', '?scope=class')).earned);
      expect(byClass).toContain(classmate.id);
      expect(byClass).not.toContain(sameSpecialty.id);

      const bySpecialty = ids((await community(viewer.agent, 'cnd', '?scope=specialty')).earned);
      expect(bySpecialty).toEqual(
        expect.arrayContaining([classmate.id, sameSpecialty.id, aimingForSsir.id]),
      );

      const byLevel = ids((await community(viewer.agent, 'cnd', '?scope=year')).earned);
      expect(byLevel).toContain(classmate.id);
      expect(byLevel).not.toContain(sameSpecialty.id);

      const noSpecialtyYet = ids(
        (await community(viewer.agent, 'cnd', '?specialty=none&year=2')).earned,
      );
      expect(noSpecialtyYet).toContain(aimingForSsir.id);
      expect(noSpecialtyYet).not.toContain(classmate.id);
    });

    it('rejects an unknown scope and returns 404 for an unknown certification', async () => {
      const viewer = await onboardedStudent(t, ing4Cim);
      await viewer.agent.get('/certifications/saa-c03/community?scope=world').expect(400);
      await viewer.agent.get('/certifications/not-a-cert/community').expect(404);
    });
  });
});
