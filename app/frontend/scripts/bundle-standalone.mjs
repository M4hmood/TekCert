// Assembles a self-contained frontend bundle in ../deploy/frontend after `next build`.
// Run it on the target machine with: PORT=3000 API_URL=http://<api> node frontend/server.js
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const out = path.resolve(app, '..', 'deploy', 'frontend');
const standalone = path.join(app, '.next', 'standalone');
// Standalone mirrors the monorepo layout, so server.js lives under frontend/.
const serverDir = path.join(out, path.basename(app));

await rm(out, { recursive: true, force: true });
await cp(standalone, out, { recursive: true, verbatimSymlinks: true });
// Next leaves static assets and public/ out of standalone; the server expects them beside server.js.
await cp(path.join(app, '.next', 'static'), path.join(serverDir, '.next', 'static'), {
  recursive: true,
});
await cp(path.join(app, 'public'), path.join(serverDir, 'public'), { recursive: true });

console.log(`Frontend bundle ready: ${path.relative(process.cwd(), serverDir)}/server.js`);
