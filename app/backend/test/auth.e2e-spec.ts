import {
  AUTH_PROBLEM,
  CurrentUserSchema,
  ProblemDetailsSchema,
  VISIBILITY_REQUIRED_MESSAGE,
} from '@tekcert/types';
import request from 'supertest';
import {
  createTestApp,
  PASSWORD,
  signUpAndVerify,
  signUpRequest,
  type TestApp,
  tokenFromMail,
  uniqueEmail,
} from './test-app';

describe('Authentication (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  const server = () => t.app.getHttpServer();

  const signUp = (email: string, extra: Record<string, unknown> = {}) =>
    signUpRequest(server(), email, extra);
  const verifiedAgent = (email = uniqueEmail()) => signUpAndVerify(t, email);

  function cookieNames(res: request.Response): string[] {
    const header = res.headers['set-cookie'] as unknown as string[] | undefined;
    return (header ?? []).map((c) => c.split('=')[0] ?? '');
  }

  describe('sign-up and verification', () => {
    it('signs up, verifies the email and signs the student in', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202, { status: 'accepted' });

      const message = t.mail.lastTo(email);
      expect(message?.subject).toBe('Confirm your TekCert account');

      const verify = await request(server())
        .post('/auth/verify-email')
        .send({ token: tokenFromMail(t.mail, email, '/verify-email') })
        .expect(200);
      expect(CurrentUserSchema.parse(verify.body)).toMatchObject({
        email,
        role: 'student',
        classCode: null,
        avatarPath: null,
        onboardingCompleted: false,
      });
      const setCookies = verify.headers['set-cookie'] as unknown as string[];
      expect(cookieNames(verify)).toEqual(['tc_access', 'tc_refresh']);
      expect(setCookies.every((c) => /HttpOnly/.test(c) && /SameSite=Lax/.test(c))).toBe(true);
    });

    it('refuses a sign-up that does not accept profile visibility', async () => {
      for (const acceptVisibility of [false, undefined]) {
        const email = uniqueEmail();
        const res = await signUp(email, { acceptVisibility }).expect(400);
        expect(ProblemDetailsSchema.parse(res.body).errors).toEqual([
          { path: 'acceptVisibility', message: VISIBILITY_REQUIRED_MESSAGE },
        ]);
        expect(t.mail.lastTo(email)).toBeUndefined();
      }
    });

    it('refuses addresses outside @tek-up.de with a field error', async () => {
      const res = await signUp('someone@gmail.com').expect(400);
      expect(ProblemDetailsSchema.parse(res.body).errors).toEqual([
        { path: 'email', message: 'Use your @tek-up.de address' },
      ]);
    });

    it('refuses weak passwords', async () => {
      const res = await signUp(uniqueEmail(), { password: 'password' }).expect(400);
      expect(res.body.errors.map((e: { path: string }) => e.path)).toContain('password');
    });

    it('answers the same for an existing account and emails the owner instead', async () => {
      const { email } = await verifiedAgent();
      await signUp(email).expect(202, { status: 'accepted' });
      expect(t.mail.lastTo(email)?.subject).toBe('You already have a TekCert account');
    });

    it('does not let a verification link be used twice', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      const token = tokenFromMail(t.mail, email, '/verify-email');
      await request(server()).post('/auth/verify-email').send({ token }).expect(200);
      const again = await request(server()).post('/auth/verify-email').send({ token }).expect(400);
      expect(again.body.type).toBe(AUTH_PROBLEM.invalidToken);
    });

    it('rate-limits resending to once a minute', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      const before = t.mail.sent.length;
      await request(server()).post('/auth/resend-verification').send({ email }).expect(202);
      expect(t.mail.sent.length).toBe(before);
      t.clock.advanceMinutes(1);
      await request(server()).post('/auth/resend-verification').send({ email }).expect(202);
      expect(t.mail.sent.length).toBe(before + 1);
    });
  });

  describe('sign-in', () => {
    it('signs in and reaches protected routes', async () => {
      const { email } = await verifiedAgent();
      const agent = request.agent(server());
      await agent.get('/auth/me').expect(401);
      await agent.post('/auth/sign-in').send({ email, password: PASSWORD }).expect(200);
      const me = await agent.get('/auth/me').expect(200);
      expect(me.body.email).toBe(email);
    });

    it('accepts the address in any case', async () => {
      const { email } = await verifiedAgent();
      await request(server())
        .post('/auth/sign-in')
        .send({ email: email.toUpperCase(), password: PASSWORD })
        .expect(200);
    });

    it('blocks unverified accounts once the password is right', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      const res = await request(server())
        .post('/auth/sign-in')
        .send({ email, password: PASSWORD })
        .expect(403);
      expect(res.body.type).toBe(AUTH_PROBLEM.emailNotVerified);
    });

    it('counts down attempts, locks for 15 minutes, then unlocks', async () => {
      const { email } = await verifiedAgent();
      const attempt = (password: string) =>
        request(server()).post('/auth/sign-in').send({ email, password });

      const left: number[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await attempt('wrong-password-1!').expect(401);
        expect(res.body.type).toBe(AUTH_PROBLEM.invalidCredentials);
        left.push(res.body.attemptsLeft);
      }
      expect(left).toEqual([4, 3, 2, 1]);

      const locked = await attempt('wrong-password-1!').expect(429);
      expect(locked.body).toMatchObject({ type: AUTH_PROBLEM.locked, retryAfterSeconds: 900 });
      // Even the right password is refused while locked.
      await attempt(PASSWORD).expect(429);

      t.clock.advanceMinutes(15);
      await attempt(PASSWORD).expect(200);
    });

    it('treats unknown addresses exactly like wrong passwords', async () => {
      const res = await request(server())
        .post('/auth/sign-in')
        .send({ email: uniqueEmail('nobody'), password: PASSWORD })
        .expect(401);
      expect(res.body).toMatchObject({ type: AUTH_PROBLEM.invalidCredentials, attemptsLeft: 4 });
    });

    it('refuses a sign-in posted from another website', async () => {
      const { email } = await verifiedAgent();
      await request(server())
        .post('/auth/sign-in')
        .set('Origin', 'https://evil.example')
        .send({ email, password: PASSWORD })
        .expect(403);
    });
  });

  describe('sessions', () => {
    it('rotates the refresh token and detects reuse of an old one', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      const agent = request.agent(server());
      const verify = await agent
        .post('/auth/verify-email')
        .send({ token: tokenFromMail(t.mail, email, '/verify-email') })
        .expect(200);
      const setCookies = verify.headers['set-cookie'] as unknown as string[];
      const stolen = setCookies.find((c) => c.startsWith('tc_refresh='))?.split(';')[0] ?? '';

      // The legitimate client refreshes and gets a new token...
      const rotated = await agent.post('/auth/refresh').expect(204);
      expect(cookieNames(rotated)).toEqual(['tc_access', 'tc_refresh']);

      // ...then the old token shows up again: the whole sign-in is revoked.
      t.clock.advanceMinutes(1);
      await request(server()).post('/auth/refresh').set('Cookie', stolen).expect(401);
      await agent.post('/auth/refresh').expect(401);
    });

    it('signs out on this device', async () => {
      const { agent } = await verifiedAgent();
      const res = await agent.post('/auth/sign-out').expect(204);
      expect(cookieNames(res)).toEqual(['tc_access', 'tc_refresh']);
      await agent.get('/auth/me').expect(401);
      await agent.post('/auth/refresh').expect(401);
    });

    it('expires the access token after 15 minutes', async () => {
      const { agent } = await verifiedAgent();
      t.clock.advanceMinutes(16);
      await agent.get('/auth/me').expect(401);
      await agent.post('/auth/refresh').expect(204);
      await agent.get('/auth/me').expect(200);
    });

    it('keeps "stay signed in" sessions beyond 12 hours, but not the others', async () => {
      const { email } = await verifiedAgent();
      const remembered = request.agent(server());
      const browserOnly = request.agent(server());
      await remembered
        .post('/auth/sign-in')
        .send({ email, password: PASSWORD, remember: true })
        .expect(200);
      await browserOnly.post('/auth/sign-in').send({ email, password: PASSWORD }).expect(200);

      t.clock.advanceMinutes(13 * 60);
      await remembered.post('/auth/refresh').expect(204);
      await browserOnly.post('/auth/refresh').expect(401);
    });
  });

  describe('password reset', () => {
    it('resets the password and signs out every device', async () => {
      const { agent, email } = await verifiedAgent();
      await request(server()).post('/auth/forgot-password').send({ email }).expect(202);
      expect(t.mail.lastTo(email)?.subject).toBe('Reset your TekCert password');

      const token = tokenFromMail(t.mail, email, '/reset-password');
      await request(server())
        .post('/auth/reset-password')
        .send({ token, password: 'brand-new-pass-7' })
        .expect(204);

      await agent.post('/auth/refresh').expect(401);
      await request(server()).post('/auth/sign-in').send({ email, password: PASSWORD }).expect(401);
      await request(server())
        .post('/auth/sign-in')
        .send({ email, password: 'brand-new-pass-7' })
        .expect(200);
    });

    it('expires reset links after 30 minutes', async () => {
      const { email } = await verifiedAgent();
      await request(server()).post('/auth/forgot-password').send({ email }).expect(202);
      const token = tokenFromMail(t.mail, email, '/reset-password');
      t.clock.advanceMinutes(31);
      const res = await request(server())
        .post('/auth/reset-password')
        .send({ token, password: 'brand-new-pass-7' })
        .expect(400);
      expect(res.body.type).toBe(AUTH_PROBLEM.invalidToken);
    });

    it('does not reveal whether an address has an account', async () => {
      const before = t.mail.sent.length;
      await request(server())
        .post('/auth/forgot-password')
        .send({ email: uniqueEmail('nobody') })
        .expect(202, { status: 'accepted' });
      expect(t.mail.sent.length).toBe(before);
    });
  });

  describe('access control', () => {
    it('protects private routes and leaves the catalog public', async () => {
      const me = await request(server()).get('/auth/me').expect(401);
      expect(me.body.type).toBe(AUTH_PROBLEM.unauthenticated);
      await request(server()).get('/certifications').expect(200);
      await request(server()).get('/health').expect(200);
    });

    it('rejects a forged access token', async () => {
      await request(server())
        .get('/auth/me')
        .set('Cookie', 'tc_access=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.')
        .expect(401);
    });
  });
});
