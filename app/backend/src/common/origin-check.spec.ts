import type { NextFunction, Request, Response } from 'express';
import { originCheck } from './origin-check';

function run(method: string, origin?: string) {
  const req = {
    method,
    originalUrl: '/auth/sign-in',
    get: (name: string) => (name === 'origin' ? origin : undefined),
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn() as NextFunction;
  originCheck(['http://localhost:3000/'])(req, res as unknown as Response, next);
  return { res, next };
}

describe('originCheck', () => {
  it('lets the web origin post', () => {
    expect(run('POST', 'http://localhost:3000').next).toHaveBeenCalled();
  });

  it('refuses a post from another site', () => {
    const { res, next } = run('POST', 'https://evil.example');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('ignores safe methods and requests without an Origin header', () => {
    expect(run('GET', 'https://evil.example').next).toHaveBeenCalled();
    expect(run('POST').next).toHaveBeenCalled();
  });
});
