/** End-to-end tests: boot the real app against the tekcert_test database (see test/setup-env.ts). */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  // Full type-aware compilation keeps Nest's decorator metadata intact; 151002 only warns about NodeNext.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 30000,
};
