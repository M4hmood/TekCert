import type { NextRequest } from 'next/server';
import { apiUrl } from '@/lib/api';

/**
 * Same-origin proxy: the browser only talks to the web origin, and /api/* is forwarded to the API
 * (the internal load balancer on AWS). API_URL is read per request, so one build runs anywhere.
 */
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

/** Hop-by-hop headers must not be forwarded (RFC 9110 section 7.6.1). */
const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host'];

async function proxy(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  const target = `${apiUrl()}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  HOP_BY_HOP.forEach((name) => headers.delete(name));
  headers.set('x-forwarded-host', request.headers.get('host') ?? '');
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
      cache: 'no-store',
      // Required by Node's fetch to stream a request body.
      ...(hasBody && { duplex: 'half' }),
    } as RequestInit);
  } catch {
    return Response.json(
      { type: 'about:blank', title: 'Bad Gateway', status: 502, detail: 'The API is unreachable.' },
      { status: 502, headers: { 'content-type': 'application/problem+json' } },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  // fetch already decoded the body, so the original encoding and length no longer apply.
  ['content-encoding', 'content-length', ...HOP_BY_HOP].forEach((name) =>
    responseHeaders.delete(name),
  );
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
