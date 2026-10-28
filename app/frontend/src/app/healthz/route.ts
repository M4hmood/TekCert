/** Load balancer health check for the web tier; deliberately does not call the API. */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' });
}
