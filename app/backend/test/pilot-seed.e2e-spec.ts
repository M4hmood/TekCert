import {
  DashboardSchema,
  PublicStatsSchema,
  StudentLeaderboardSchema,
  DirectorySchema,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PILOT_DEMO_EMAIL } from '../src/database/seed/pilot-plan';
import { type PilotResult, seedPilot } from '../src/database/seed/pilot';
import { LandingService } from '../src/landing/landing.service';
import { createTestApp, type TestApp } from './test-app';

const DEMO_PASSWORD = 'Demo-pilot-9!';
const PILOT = `email LIKE 'pilot.%@tek-up.de'`;

/**
 * The demo class of `pnpm db:seed:pilot`. It is written into the shared test database and
 * removed at the end, so the other suites never see it.
 */
describe('Pilot seed (e2e)', () => {
  let t: TestApp;
  let db: DataSource;
  let result: PilotResult;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
    result = await seedPilot(db, { demoPassword: DEMO_PASSWORD });
  }, 120_000);

  afterAll(async () => {
    await db.query(`DELETE FROM users WHERE ${PILOT}`);
    await t.app.close();
  });

  const scalar = async (sql: string): Promise<number> => {
    const [row] = await db.query<{ n: number }[]>(sql);
    return row?.n ?? 0;
  };
  const signIn = async (email: string, password: string) => {
    const agent = request.agent(t.app.getHttpServer());
    const res = await agent.post('/auth/sign-in').send({ email, password });
    return { agent, status: res.status };
  };

  it('creates about 60 verified, onboarded students with weeks of progress', async () => {
    expect(result).toMatchObject({ students: 61, demoCanSignIn: true });
    expect(result.preparing).toBeGreaterThan(30);
    expect(result.chapters).toBeGreaterThan(200);
    expect(await scalar(`SELECT COUNT(*)::int AS n FROM users WHERE ${PILOT}`)).toBe(61);
    expect(
      await scalar(
        `SELECT COUNT(*)::int AS n FROM users WHERE ${PILOT}
         AND (email_verified_at IS NULL OR onboarding_completed_at IS NULL OR class_id IS NULL)`,
      ),
    ).toBe(0);
    // Progress spread over weeks, never in the future.
    const [span] = await db.query<{ days: number; future: number }[]>(
      `SELECT EXTRACT(DAY FROM now() - MIN(e.created_at))::int AS days,
              COUNT(*) FILTER (WHERE e.created_at > now())::int AS future
       FROM point_events e JOIN users u ON u.id = e.user_id WHERE u.${PILOT}`,
    );
    expect(span?.days).toBeGreaterThanOrEqual(14);
    expect(span?.future).toBe(0);
  });

  it('earns its points like real students: 10 per ticked chapter, in the ledger', async () => {
    const mismatched = await scalar(
      `SELECT COUNT(*)::int AS n FROM users u
       WHERE u.${PILOT} AND
         (SELECT COALESCE(SUM(delta), 0) FROM point_events e WHERE e.user_id = u.id) <>
         10 * (SELECT COUNT(*) FROM chapter_progress p WHERE p.user_id = u.id)`,
    );
    expect(mismatched).toBe(0);
    // Everyone who finished a chapter has the first badge; nobody else has one.
    const wrongBadge = await scalar(
      `SELECT COUNT(*)::int AS n FROM users u
       WHERE u.${PILOT} AND
         EXISTS (SELECT 1 FROM chapter_progress p WHERE p.user_id = u.id) <>
         EXISTS (SELECT 1 FROM user_badges b WHERE b.user_id = u.id AND b.badge = 'first_step')`,
    );
    expect(wrongBadge).toBe(0);
    // Nobody prepares a certification they already hold.
    const both = await scalar(
      `SELECT COUNT(*)::int AS n FROM preparations p
       JOIN user_certifications c ON c.user_id = p.user_id AND c.certification_id = p.certification_id
       JOIN users u ON u.id = p.user_id WHERE u.${PILOT}`,
    );
    expect(both).toBe(0);
  });

  it('opens the demo account only, and only with its password', async () => {
    const demo = await signIn(PILOT_DEMO_EMAIL, DEMO_PASSWORD);
    expect(demo.status).toBe(200);
    expect((await signIn(PILOT_DEMO_EMAIL, 'Wrong-pilot-9!')).status).toBe(401);

    const [other] = await db.query<{ email: string }[]>(
      `SELECT email FROM users WHERE ${PILOT} AND email <> $1 LIMIT 1`,
      [PILOT_DEMO_EMAIL],
    );
    expect((await signIn(other?.email ?? '', DEMO_PASSWORD)).status).toBe(401);
  });

  it('fills the screens of the demo student', async () => {
    const { agent } = await signIn(PILOT_DEMO_EMAIL, DEMO_PASSWORD);
    const dashboard = DashboardSchema.parse((await agent.get('/me/dashboard').expect(200)).body);
    expect(dashboard.firstName).toBe('Demo');
    expect(dashboard.points).toBeGreaterThan(0);
    expect(dashboard.current).not.toBeNull();

    const board = StudentLeaderboardSchema.parse(
      (await agent.get('/leaderboard/students?scope=class&period=all').expect(200)).body,
    );
    expect(board.total).toBeGreaterThanOrEqual(19);
    expect(board.me?.points).toBe(dashboard.points);
    // Some classmates hide their name and stay ranked.
    expect(board.rows.length).toBeGreaterThan(5);

    const directory = DirectorySchema.parse(
      (await agent.get('/community/students?scope=class').expect(200)).body,
    );
    expect(directory.total).toBeGreaterThanOrEqual(19);

    t.app.get(LandingService).forget();
    const stats = PublicStatsSchema.parse(
      (await request(t.app.getHttpServer()).get('/stats/public').expect(200)).body,
    );
    expect(stats.students).toBeGreaterThanOrEqual(61);
    expect(stats.preparing).toBeGreaterThan(30);
  });

  it('replaces the last pilot class when run again, and touches nobody else', async () => {
    const others = () => scalar(`SELECT COUNT(*)::int AS n FROM users WHERE NOT (${PILOT})`);
    const before = await others();
    const again = await seedPilot(db, { demoPassword: DEMO_PASSWORD });
    expect(again).toEqual(result);
    expect(await scalar(`SELECT COUNT(*)::int AS n FROM users WHERE ${PILOT}`)).toBe(61);
    expect(await others()).toBe(before);
  }, 120_000);

  it('leaves every account closed without a demo password', async () => {
    const closed = await seedPilot(db, {});
    expect(closed.demoCanSignIn).toBe(false);
    expect((await signIn(PILOT_DEMO_EMAIL, DEMO_PASSWORD)).status).toBe(401);
  }, 120_000);

  it('refuses to run in production, or with a weak demo password', async () => {
    await expect(seedPilot(db, { nodeEnv: 'production' })).rejects.toThrow(
      /never runs in production/,
    );
    await expect(seedPilot(db, { demoPassword: 'short' })).rejects.toThrow(/too weak/);
    // Neither attempt removed the class that was there.
    expect(await scalar(`SELECT COUNT(*)::int AS n FROM users WHERE ${PILOT}`)).toBe(61);
  });
});
