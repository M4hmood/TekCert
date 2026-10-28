import { TEST_DATABASE_URL } from './test-database';

// e2e tests always run against the dedicated test database, never the dev one.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = TEST_DATABASE_URL;
