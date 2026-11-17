import path from 'node:path';
import type { NextConfig } from 'next';

// The monorepo root, so standalone output traces workspace packages (@tekcert/*) correctly.
const workspaceRoot = path.join(process.cwd(), '..');

const nextConfig: NextConfig = {
  // Self-contained server.js bundle that runs on its own EC2 instance (see scripts/bundle-standalone.mjs).
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  transpilePackages: ['@tekcert/ui'],
  poweredByHeader: false,
  // The dev server's floating "N" button is a 32px target over every page in screenshots and
  // accessibility checks; build and runtime errors still show in the dev overlay without it.
  devIndicators: false,
};

export default nextConfig;
