import { z } from 'zod';

/** RFC 9457 Problem Details, the body of every API error response. */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  /** Sign-in failures: attempts left before the lockout. */
  attemptsLeft: z.number().int().nonnegative().optional(),
  /** Lockouts and resend cooldowns: seconds until the action is allowed again. */
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
