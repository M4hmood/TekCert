import { validateEnv } from './env';

describe('validateEnv', () => {
  const valid = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('applies defaults', () => {
    expect(validateEnv(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      LOG_LEVEL: 'info',
      DATABASE_URL: valid.DATABASE_URL,
      CORS_ORIGIN: ['http://localhost:3000'],
    });
  });

  it('splits a comma-separated CORS_ORIGIN', () => {
    expect(
      validateEnv({ ...valid, CORS_ORIGIN: 'https://a.test, https://b.test' }).CORS_ORIGIN,
    ).toEqual(['https://a.test', 'https://b.test']);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(/DATABASE_URL/);
  });
});
