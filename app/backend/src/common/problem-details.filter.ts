import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@tekcert/types';
import type { Request, Response } from 'express';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

export const VALIDATION_PROBLEM_TYPE = 'urn:tekcert:problem:validation';

/** Postgres error codes that map to a client error rather than a 500. */
const POSTGRES_STATUS: Record<string, HttpStatus> = {
  '23505': HttpStatus.CONFLICT, // unique_violation
  '23503': HttpStatus.CONFLICT, // foreign_key_violation
};

/**
 * Turns every error into an RFC 9457 Problem Details response, so clients only ever
 * have to handle one error shape. Unexpected errors are logged and never leak internals.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const problem = this.toProblem(exception);
    problem.instance = request.originalUrl;
    if (request.id !== undefined) problem.requestId = String(request.id);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, requestId: problem.requestId }, problem.title);
    }

    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof ZodValidationException) {
      const error = exception.getZodError();
      return {
        type: VALIDATION_PROBLEM_TYPE,
        title: 'Validation failed',
        status: HttpStatus.BAD_REQUEST,
        detail: 'One or more fields are invalid.',
        errors:
          error instanceof ZodError
            ? error.issues.map((issue) => ({
                path: issue.path.map(String).join('.'),
                message: issue.message,
              }))
            : [],
      };
    }
    if (exception instanceof ZodSerializationException) {
      return problem(HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && 'message' in body && typeof body.message === 'string'
            ? body.message
            : undefined;
      return problem(status, detail);
    }
    if (exception instanceof EntityNotFoundError) {
      return problem(HttpStatus.NOT_FOUND);
    }
    if (exception instanceof QueryFailedError) {
      const code: unknown = (exception.driverError as { code?: unknown }).code;
      const status = typeof code === 'string' ? POSTGRES_STATUS[code] : undefined;
      if (status) return problem(status);
    }
    return problem(HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

function problem(status: number, detail?: string): ProblemDetails {
  const title = STATUS_CODES[status] ?? 'Error';
  return {
    type: 'about:blank',
    title,
    status,
    ...(detail && detail !== title ? { detail } : {}),
  };
}
