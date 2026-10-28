/** Unit tests: fast, no database. */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/prisma'],
  testRegex: '.*\\.spec\\.ts$',
  // Full type-aware compilation keeps Nest's decorator metadata intact; 151002 only warns about NodeNext.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // The generated Prisma client imports its siblings with .js extensions (NodeNext style).
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
