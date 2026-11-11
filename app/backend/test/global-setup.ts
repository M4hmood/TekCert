import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database';

/**
 * Brings the test database to the latest migration, removes the students of earlier runs and
 * seeds it, once per run. Without the clean-up, lists such as "Also preparing" fill up with old
 * students and the tests that read them start to fail.
 */
export default function globalSetup(): void {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('pnpm db:migrate', { env, stdio: 'inherit' });
  // Everything a student owns goes with them (foreign keys cascade).
  execSync('pnpm typeorm query "DELETE FROM users"', { env, stdio: 'inherit' });
  execSync('pnpm db:seed', { env, stdio: 'inherit' });
}
