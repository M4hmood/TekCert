import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { AccessTokenService } from './access-token.service';

function service(secret = 'x'.repeat(32)) {
  const clock = { current: new Date('2026-10-28T10:00:00Z'), now: () => clock.current };
  const config = { get: () => secret } as unknown as ConfigService<Env, true>;
  return { tokens: new AccessTokenService(config, clock), clock };
}

describe('AccessTokenService', () => {
  it('round-trips the user id and role', async () => {
    const { tokens } = service();
    const token = await tokens.sign({ userId: 'u-1', role: 'student' });
    await expect(tokens.verify(token)).resolves.toEqual({ userId: 'u-1', role: 'student' });
  });

  it('expires after 15 minutes', async () => {
    const { tokens, clock } = service();
    const token = await tokens.sign({ userId: 'u-1', role: 'student' });
    clock.current = new Date(clock.current.getTime() + 14 * 60_000);
    await expect(tokens.verify(token)).resolves.not.toBeNull();
    clock.current = new Date(clock.current.getTime() + 2 * 60_000);
    await expect(tokens.verify(token)).resolves.toBeNull();
  });

  it('rejects a token signed with another key', async () => {
    const token = await service('y'.repeat(32)).tokens.sign({ userId: 'u-1', role: 'admin' });
    await expect(service().tokens.verify(token)).resolves.toBeNull();
  });

  it('rejects missing and malformed tokens', async () => {
    const { tokens } = service();
    await expect(tokens.verify(undefined)).resolves.toBeNull();
    await expect(tokens.verify('not.a.jwt')).resolves.toBeNull();
  });
});
