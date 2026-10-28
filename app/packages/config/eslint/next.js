import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { base } from './base.js';

/** Base rules plus the Next.js core-web-vitals set. Requires eslint-config-next in the consumer. */
export const next = [...base, ...nextVitals, ...nextTs, { ignores: ['next-env.d.ts'] }];

export default next;
