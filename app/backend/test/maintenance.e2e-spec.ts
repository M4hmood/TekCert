import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  EXPIRED_KEPT_DAYS,
  LOGIN_ATTEMPTS_KEPT_DAYS,
  MaintenanceService,
  NOTIFICATIONS_KEPT_DAYS,
} from '../src/maintenance/maintenance.service';
import { createTestApp, onboardedStudent, type TestApp, uniqueEmail } from './test-app';

describe('Nightly clean-up (e2e)', () => {
  let t: TestApp;
  let db: DataSource;
  const DAY = 86_400_000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const count = async (table: string, where: string, params: unknown[]): Promise<number> => {
    const [row] = await db.query<{ n: number }[]>(
      `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`,
      params,
    );
    return row?.n ?? 0;
  };
  const notify = (userId: string, key: string, at: Date) =>
    db.query(
      `INSERT INTO notifications (user_id, kind, payload, dedupe_key, occurred_at)
       VALUES ($1, 'level_reached', '{"level":2}'::jsonb, $2, $3)`,
      [userId, key, at],
    );

  it('removes expired sessions and links, stale sign-in counters and old notifications', async () => {
    const klass = { year: 3, targetSpecialty: 'AIOT', group: 'D' };
    const old = await onboardedStudent(t, klass);
    const current = await onboardedStudent(t, klass);
    const longAgo = uniqueEmail('longago');
    const recent = uniqueEmail('recent');
    for (const email of [longAgo, recent]) {
      await request(t.app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email, password: 'wrong-password-1!' })
        .expect(401);
    }

    // Age the rows of one student past each limit; those of the other stay as they are.
    await db.query(`UPDATE sessions SET expires_at = $2 WHERE user_id = $1`, [
      old.id,
      daysAgo(EXPIRED_KEPT_DAYS + 1),
    ]);
    await db.query(`UPDATE email_tokens SET expires_at = $2 WHERE user_id = $1`, [
      old.id,
      daysAgo(EXPIRED_KEPT_DAYS + 1),
    ]);
    await db.query(`UPDATE login_attempts SET last_failed_at = $2 WHERE email = $1`, [
      longAgo,
      daysAgo(LOGIN_ATTEMPTS_KEPT_DAYS + 1),
    ]);
    await notify(old.id, 'old', daysAgo(NOTIFICATIONS_KEPT_DAYS + 1));
    await notify(old.id, 'recent', daysAgo(NOTIFICATIONS_KEPT_DAYS - 1));
    const ledger = () => count('point_events', 'TRUE', []);
    const ledgerBefore = await ledger();

    const removed = await t.app.get(MaintenanceService).cleanUp();
    expect(removed.sessions).toBeGreaterThanOrEqual(1);
    expect(removed.emailTokens).toBeGreaterThanOrEqual(1);
    expect(removed.loginAttempts).toBeGreaterThanOrEqual(1);
    expect(removed.notifications).toBeGreaterThanOrEqual(1);

    expect(await count('sessions', 'user_id = $1', [old.id])).toBe(0);
    expect(await count('email_tokens', 'user_id = $1', [old.id])).toBe(0);
    expect(await count('login_attempts', 'email = $1', [longAgo])).toBe(0);
    expect(await count('notifications', `user_id = $1 AND dedupe_key = 'old'`, [old.id])).toBe(0);

    // What is still in use stays.
    expect(await count('sessions', 'user_id = $1', [current.id])).toBeGreaterThan(0);
    expect(await count('login_attempts', 'email = $1', [recent])).toBe(1);
    expect(await count('notifications', `user_id = $1 AND dedupe_key = 'recent'`, [old.id])).toBe(
      1,
    );
    await current.agent.get('/auth/me').expect(200);
    // The account goes nowhere, and the ledger is never part of a clean-up.
    expect(await count('users', 'id = $1', [old.id])).toBe(1);
    expect(await ledger()).toBe(ledgerBefore);

    // A second run finds nothing left to remove from these students.
    await t.app.get(MaintenanceService).cleanUp();
    expect(await count('sessions', 'user_id = $1', [current.id])).toBeGreaterThan(0);
  });
});
