import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database';

/** Brings the test database to the latest migration and seeds it once per run. */
export default function globalSetup(): void {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('pnpm db:migrate', { env, stdio: 'inherit' });
  execSync('pnpm db:seed', { env, stdio: 'inherit' });
}
