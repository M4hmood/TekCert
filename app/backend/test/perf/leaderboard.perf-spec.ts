import { LEADERBOARD_PERIODS, LEADERBOARD_SCOPES } from '@tekcert/types';
import { DataSource } from 'typeorm';
import { createTestApp, onboardedStudent, type TestApp } from '../test-app';

const STUDENTS = 1000;
/** Ledger rows per student, spread over the last 200 days: 100,000 rows in all. */
const EVENTS_PER_STUDENT = 100;
const REQUESTS = 100;
const P95_BUDGET_MS = 300;

/** S06 "Done when": p95 under 300 ms with 1,000 seeded students. */
describe('Leaderboard performance', () => {
  let t: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
    // Verified, onboarded students spread over every class; one in ten hides their name.
    await db.query(
      `INSERT INTO users (email, first_name, last_name, password_hash, email_verified_at,
                          visibility_consented_at, class_id, onboarding_completed_at,
                          onboarding_step, leaderboard_visible)
       SELECT 'perf.' || g || '@tek-up.de', 'Perf', 'Student ' || g, 'not-a-hash', now(), now(),
              (SELECT id FROM classes ORDER BY code OFFSET (g % (SELECT COUNT(*) FROM classes))
               LIMIT 1),
              now(), 5, g % 10 <> 0
       FROM generate_series(1, $1) AS g`,
      [STUDENTS],
    );
    await db.query(
      `INSERT INTO point_events (user_id, delta, reason, created_at)
       SELECT u.id, 10, 'chapter_done', now() - random() * interval '200 days'
       FROM users u CROSS JOIN generate_series(1, $1)
       WHERE u.email LIKE 'perf.%'`,
      [EVENTS_PER_STUDENT],
    );
    await db.query('ANALYZE');
  });

  afterAll(async () => {
    await t.app.close();
  });

  it(`answers every board with a p95 under ${P95_BUDGET_MS} ms`, async () => {
    const [ledger] = await db.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM point_events',
    );
    expect(ledger?.count).toBe(STUDENTS * EVENTS_PER_STUDENT);
    // A class with seeded students in it, like any real viewer.
    const { agent } = await onboardedStudent(t, { year: 4, specialty: 'CIM', group: 'A' });

    const boards = [
      ...LEADERBOARD_SCOPES.flatMap((scope) =>
        LEADERBOARD_PERIODS.map(
          (period) => `/leaderboard/students?scope=${scope}&period=${period}`,
        ),
      ),
      ...LEADERBOARD_PERIODS.map((period) => `/leaderboard/specialties?period=${period}`),
    ];
    const results: { board: string; p50: number; p95: number; max: number }[] = [];
    for (const board of boards) {
      await agent.get(board).expect(200);
      const times: number[] = [];
      for (let i = 0; i < REQUESTS; i++) {
        const started = performance.now();
        await agent.get(board).expect(200);
        times.push(performance.now() - started);
      }
      times.sort((a, b) => a - b);
      const at = (quantile: number) =>
        Math.round(times[Math.min(times.length - 1, Math.floor(times.length * quantile))] ?? 0);
      results.push({ board, p50: at(0.5), p95: at(0.95), max: at(1) });
    }

    console.table(results);
    for (const result of results) expect(result.p95).toBeLessThan(P95_BUDGET_MS);
  });
});
