import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database';

/** Brings the test database to the latest migration and seeds it once per run. */
export default function globalSetup(): void {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('pnpm exec prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('pnpm exec tsx prisma/seed/index.ts', { env, stdio: 'inherit' });
}
