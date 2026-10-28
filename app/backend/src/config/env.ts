import { z } from 'zod';

const BooleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    /** Public URL of the web app: links in emails and the allowed Origin for state-changing requests. */
    WEB_URL: z.url().default('http://localhost:3000'),
    /** Extra origins allowed to call the API from a browser (comma-separated). */
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:3000')
      .transform((value) => value.split(',').map((origin) => origin.trim())),
    /** HMAC key for access tokens. At least 32 characters; on AWS it comes from Secrets Manager. */
    JWT_ACCESS_SECRET: z.string().min(32, 'Must be at least 32 characters'),
    /** Cookies are Secure (HTTPS only) unless explicitly disabled for local HTTP. */
    COOKIE_SECURE: BooleanString.optional(),
    /** SMTP connection, e.g. smtp://localhost:1025 for Mailpit or smtps://user:pass@host:465. */
    SMTP_URL: z.string().min(1).default('smtp://localhost:1025'),
    MAIL_FROM: z.string().min(3).default('TekCert <no-reply@tek-up.de>'),
    /** Requests per minute per IP on /auth/* (brute-force brake on top of the per-account lockout). */
    AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof EnvSchema>;

/** Used by ConfigModule: the app refuses to start with an invalid environment. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
