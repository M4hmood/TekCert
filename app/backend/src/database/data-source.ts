import 'dotenv/config';
import 'reflect-metadata';
import path from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './snake-naming.strategy';

/** Shared by the Nest app (TypeOrmModule) and the TypeORM CLI, so both see the same schema. */
export function dataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    // Forward slashes: TypeORM globs don't match Windows backslash paths.
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}').replace(/\\/g, '/')],
    namingStrategy: new SnakeNamingStrategy(),
    // gen_random_uuid() is built into Postgres 13+, no extension to install.
    uuidExtension: 'pgcrypto',
    // The schema only changes through reviewed migrations, never at startup.
    synchronize: false,
    migrationsRun: false,
    migrationsTransactionMode: 'each',
  };
}

/** Entry point for the CLI: `pnpm typeorm migration:run` etc. */
export default new DataSource(dataSourceOptions(process.env.DATABASE_URL ?? ''));
