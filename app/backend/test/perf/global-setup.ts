import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { TEST_DATABASE_URL } from '../test-database';

/** Drops and recreates the performance database, then migrates and seeds the catalog. */
export default async function globalSetup(): Promise<void> {
  const target = new URL(TEST_DATABASE_URL);
  const name = target.pathname.slice(1);
  if (!/^[a-z_]+_perf$/.test(name)) {
    throw new Error(`Refusing to rebuild "${name}": the performance database must end in _perf`);
  }
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
  } finally {
    await client.end();
  }
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('pnpm db:migrate', { env, stdio: 'inherit' });
  execSync('pnpm db:seed', { env, stdio: 'inherit' });
}
