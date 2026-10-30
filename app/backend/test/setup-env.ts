import { TEST_DATABASE_URL } from './test-database';

// e2e tests always run against the dedicated test database, never the dev one.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-at-least-32-characters';
process.env.WEB_URL = 'http://localhost:3000';
process.env.COOKIE_SECURE = 'false';
// The per-IP limit is tested separately; the flows below send many requests from one IP.
process.env.AUTH_RATE_LIMIT = '1000';
// S3Mock from docker compose (a service container in CI); it creates the bucket at start.
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9090';
process.env.S3_FORCE_PATH_STYLE = 'true';
process.env.S3_BUCKET = 'tekcert-avatars';
process.env.S3_ACCESS_KEY_ID = 'test';
process.env.S3_SECRET_ACCESS_KEY = 'test';
