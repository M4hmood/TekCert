import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/index.ts',
  },
  datasource: {
    // `prisma generate` doesn't need a database, so a missing URL only fails commands that connect.
    url: process.env.DATABASE_URL ?? '',
  },
});
