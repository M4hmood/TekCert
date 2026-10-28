/** Unit tests: fast, no database. */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  // Full type-aware compilation keeps Nest's decorator metadata intact; 151002 only warns about NodeNext.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
