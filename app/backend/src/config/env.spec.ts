import { validateEnv } from './env';

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
  };

  it('applies defaults', () => {
    expect(validateEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      LOG_LEVEL: 'info',
      WEB_URL: 'http://localhost:3000',
      CORS_ORIGIN: ['http://localhost:3000'],
      COOKIE_SECURE: false,
      SMTP_URL: 'smtp://127.0.0.1:1025',
      AUTH_RATE_LIMIT: 20,
    });
  });

  it('makes cookies Secure in production unless disabled explicitly', () => {
    expect(validateEnv({ ...valid, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
    expect(
      validateEnv({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'false' }).COOKIE_SECURE,
    ).toBe(false);
  });

  it('splits a comma-separated CORS_ORIGIN', () => {
    expect(
      validateEnv({ ...valid, CORS_ORIGIN: 'https://a.test, https://b.test' }).CORS_ORIGIN,
    ).toEqual(['https://a.test', 'https://b.test']);
  });

  it('uses the instance role on AWS unless both S3 keys are set', () => {
    expect(validateEnv(valid)).toMatchObject({
      S3_BUCKET: 'tekcert-avatars',
      S3_FORCE_PATH_STYLE: false,
    });
    expect(validateEnv(valid).S3_ACCESS_KEY_ID).toBeUndefined();
    expect(() => validateEnv({ ...valid, S3_ACCESS_KEY_ID: 'minio' })).toThrow(
      /S3_SECRET_ACCESS_KEY/,
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });
});
