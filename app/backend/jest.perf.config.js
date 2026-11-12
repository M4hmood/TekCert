/**
 * Performance check for the leaderboards (S06): 1,000 seeded students in a database of its own,
 * tekcert_perf, rebuilt on every run. Not part of CI: run it with `pnpm test:perf`.
 */
process.env.TEST_DATABASE_URL =
  process.env.PERF_DATABASE_URL ?? 'postgresql://tekcert:tekcert@localhost:5432/tekcert_perf';

/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.e2e.config.js'),
  testRegex: '.*\\.perf-spec\\.ts$',
  globalSetup: '<rootDir>/test/perf/global-setup.ts',
  testTimeout: 600000,
};
