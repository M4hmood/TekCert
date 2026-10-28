import { type ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { ProblemDetailsFilter, VALIDATION_PROBLEM_TYPE } from './problem-details.filter';

function run(exception: unknown) {
  const response = {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl: '/certifications?level=x', id: 'req-1' }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new ProblemDetailsFilter().catch(exception, host);
  return { response, body: response.json.mock.calls[0]?.[0] as Record<string, unknown> };
}

describe('ProblemDetailsFilter', () => {
  it('maps zod validation errors to 400 with field errors', () => {
    const result = z.object({ level: z.enum(['a']) }).safeParse({ level: 'x' });
    if (result.success) throw new Error('expected failure');
    const { response, body } = run(new ZodValidationException(result.error));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(body).toMatchObject({
      type: VALIDATION_PROBLEM_TYPE,
      status: 400,
      instance: '/certifications?level=x',
      requestId: 'req-1',
      errors: [{ path: 'level' }],
    });
  });

  it('keeps the message of an HttpException as detail', () => {
    const { body } = run(new NotFoundException('Certification "xyz" not found'));
    expect(body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Certification "xyz" not found',
    });
  });

  it('omits a detail that only repeats the title', () => {
    const { body } = run(new BadRequestException());
    expect(body).not.toHaveProperty('detail');
  });

  it('maps a Prisma unique violation to 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    expect(run(error).body).toMatchObject({ status: 409, title: 'Conflict' });
  });

  it('hides unexpected errors behind a 500', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { body } = run(new Error('database password is hunter2'));
    expect(body).toMatchObject({ status: 500, title: 'Internal Server Error' });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
