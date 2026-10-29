import type { Repository } from 'typeorm';
import type { LoginAttempt } from '../database/entities';
import { LoginAttemptsService } from './login-attempts.service';

/** Just enough of a TypeORM repository, backed by a Map. */
function fakeRepository() {
  const rows = new Map<string, LoginAttempt>();
  return {
    findOneBy: async ({ email }: { email: string }) => rows.get(email) ?? null,
    save: async (row: LoginAttempt) => {
      rows.set(row.email, { ...row });
      return row;
    },
    delete: async ({ email }: { email: string }) => {
      rows.delete(email);
    },
  } as unknown as Repository<LoginAttempt>;
}

function setup() {
  const clock = { current: new Date('2026-10-28T10:00:00Z'), now: () => clock.current };
  const advance = (minutes: number) => {
    clock.current = new Date(clock.current.getTime() + minutes * 60_000);
  };
  return { attempts: new LoginAttemptsService(fakeRepository(), clock), advance };
}

const EMAIL = 'student@tek-up.de';

describe('LoginAttemptsService', () => {
  it('counts down and locks on the 5th failure', async () => {
    const { attempts } = setup();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await attempts.recordFailure(EMAIL));
    expect(results.slice(0, 4)).toEqual(
      [4, 3, 2, 1].map((n) => ({ locked: false, attemptsLeft: n })),
    );
    expect(results[4]).toEqual({ locked: true, retryAfterSeconds: 900 });
    await expect(attempts.status(EMAIL)).resolves.toEqual({ locked: true, retryAfterSeconds: 900 });
  });

  it('unlocks after 15 minutes with a fresh count', async () => {
    const { attempts, advance } = setup();
    for (let i = 0; i < 5; i++) await attempts.recordFailure(EMAIL);
    advance(15);
    await expect(attempts.status(EMAIL)).resolves.toEqual({ locked: false });
    await expect(attempts.recordFailure(EMAIL)).resolves.toEqual({
      locked: false,
      attemptsLeft: 4,
    });
  });

  it('forgets failures older than the lockout window', async () => {
    const { attempts, advance } = setup();
    for (let i = 0; i < 4; i++) await attempts.recordFailure(EMAIL);
    advance(16);
    await expect(attempts.recordFailure(EMAIL)).resolves.toEqual({
      locked: false,
      attemptsLeft: 4,
    });
  });

  it('resets after a successful sign-in', async () => {
    const { attempts } = setup();
    await attempts.recordFailure(EMAIL);
    await attempts.reset(EMAIL);
    await expect(attempts.recordFailure(EMAIL)).resolves.toEqual({
      locked: false,
      attemptsLeft: 4,
    });
  });
});
