import { apiUrl } from '@/lib/api';

/**
 * One address for an uptime monitor (docs/runbook.md): 200 when the web app, the API and the
 * database all answer, 503 otherwise. The load balancer keeps using /healthz, which never
 * calls the API: a slow API must not get healthy web servers replaced.
 */
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

type Tier = 'ok' | 'down';

export async function GET() {
  let api: Tier = 'down';
  let database: Tier = 'down';
  try {
    const res = await fetch(`${apiUrl()}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // The API is up as soon as it answers; its own check says whether the database is.
    api = 'ok';
    database = res.ok ? 'ok' : 'down';
  } catch {
    // Unreachable or too slow: both stay "down".
  }
  const healthy = api === 'ok' && database === 'ok';
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', web: 'ok', api, database },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
