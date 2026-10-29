import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (SameSite=Lax cookies are the first line): a browser sending a
 * state-changing request must come from an allowed origin. Requests without an Origin header
 * (server-to-server, CLI, tests) are not browser cross-site requests and pass through.
 */
export function originCheck(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map((origin) => new URL(origin).origin));
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || !origin || allowed.has(origin)) {
      next();
      return;
    }
    res.status(403).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      detail: 'Cross-origin request refused.',
      instance: req.originalUrl,
    });
  };
}
