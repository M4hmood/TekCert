import { HttpException } from '@nestjs/common';
import type { ProblemDetails } from '@tekcert/types';

/** An error with a specific Problem Details type and extensions (e.g. attemptsLeft). */
export class ProblemException extends HttpException {
  constructor(readonly problem: Omit<ProblemDetails, 'instance' | 'requestId'>) {
    super(problem, problem.status);
  }
}
