// Backup and restore for the Postgres of docker compose (docs/runbook.md).
//
//   pnpm db:backup                      dump the `tekcert` database into backups/
//   pnpm db:backup -- --db tekcert_test  dump another database
//   pnpm db:restore -- <file> --into <database>
//   pnpm db:backup:check                dump, restore into a scratch database, compare, clean up
//
// On AWS the database is backed up by RDS itself; these commands are for the machines where
// Postgres runs in a container. They talk to the `db` service, so run them from app/.
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, statSync } from 'node:fs';
import path from 'node:path';

const USER = 'tekcert';
const BACKUP_DIR = path.resolve(import.meta.dirname, '..', 'backups');
const SCRATCH = 'tekcert_restore_check';
const NAME = /^[a-z][a-z0-9_]*$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Runs a command inside the db container. `stdin` and `stdout` may be file descriptors. */
function inDb(args, { stdin = 'ignore', stdout = 'pipe' } = {}) {
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'db', ...args], {
    stdio: [stdin, stdout, 'pipe'],
    encoding: stdout === 'pipe' ? 'utf8' : undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) fail(`Could not run docker: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${args[0]} failed:\n${String(result.stderr ?? '').trim()}`);
  }
  return typeof result.stdout === 'string' ? result.stdout : '';
}

function psql(database, sql) {
  return inDb(['psql', '-U', USER, '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

function checkName(database) {
  if (!NAME.test(database)) fail(`"${database}" is not a database name.`);
  return database;
}

/** Writes a compressed dump (pg_dump custom format) and returns its path. */
function backup(database) {
  checkName(database);
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(BACKUP_DIR, `${database}-${stamp}.dump`);
  const out = openSync(file, 'w');
  try {
    inDb(['pg_dump', '-U', USER, '-d', database, '-Fc'], { stdout: out });
  } finally {
    closeSync(out);
  }
  if (statSync(file).size === 0) fail(`The dump of ${database} is empty.`);
  return file;
}

/** Replaces the content of `database` with the dump. The database must exist. */
function restore(file, database) {
  checkName(database);
  if (!existsSync(file)) fail(`No such file: ${file}`);
  const input = openSync(file, 'r');
  try {
    inDb(
      [
        'pg_restore',
        '-U',
        USER,
        '-d',
        database,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--exit-on-error',
      ],
      { stdin: input },
    );
  } finally {
    closeSync(input);
  }
}

/** Rows per table, as "table=count" lines in table order: the same for two identical databases. */
function rowCounts(database) {
  const tables = psql(
    database,
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  )
    .split('\n')
    .filter(Boolean);
  if (!tables.length) return [];
  const counts = psql(
    database,
    tables.map((table) => `SELECT '${table}=' || COUNT(*) FROM "${table}"`).join(' UNION ALL '),
  );
  return counts.split('\n').filter(Boolean).sort();
}

/** Proves that a backup can be restored: the restored database has the same rows per table. */
function check(database) {
  const file = backup(database);
  psql('postgres', `DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  psql('postgres', `CREATE DATABASE ${SCRATCH}`);
  try {
    restore(file, SCRATCH);
    const original = rowCounts(database);
    const restored = rowCounts(SCRATCH);
    const differences = original.filter((line, i) => line !== restored[i]);
    if (!original.length || original.length !== restored.length || differences.length) {
      fail(
        `The restored database differs from ${database}:\n` +
          `  original: ${original.join(', ')}\n  restored: ${restored.join(', ')}`,
      );
    }
    const rows = original.reduce((sum, line) => sum + Number(line.split('=')[1]), 0);
    console.log(
      `Restore check passed: ${original.length} tables and ${rows} rows of ${database} came back from ${path.basename(file)}.`,
    );
  } finally {
    psql('postgres', `DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const option = (name) => {
  const at = rest.indexOf(name);
  return at >= 0 ? rest[at + 1] : undefined;
};

switch (command) {
  case 'backup': {
    const file = backup(option('--db') ?? 'tekcert');
    console.log(
      `Backup written: ${path.relative(process.cwd(), file)} (${statSync(file).size} bytes)`,
    );
    break;
  }
  case 'restore': {
    const file = rest.find((arg, i) => !arg.startsWith('--') && rest[i - 1] !== '--into');
    const into = option('--into');
    if (!file || !into) {
      fail(
        'Usage: pnpm db:restore -- <file> --into <database>\nThe database is replaced by the dump.',
      );
    }
    restore(path.resolve(file), into);
    console.log(`Restored ${path.basename(file)} into ${into}.`);
    break;
  }
  case 'check':
    check(option('--db') ?? 'tekcert');
    break;
  default:
    fail('Usage: db-backup.mjs backup | restore <file> --into <database> | check');
}
