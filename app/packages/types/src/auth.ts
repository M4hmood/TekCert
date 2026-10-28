import { z } from 'zod';

/** Only institute addresses can register. */
export const INSTITUTE_EMAIL_DOMAIN = 'tek-up.de';

export const PASSWORD_MIN_LENGTH = 8;
/** argon2 hashes any length, but an upper bound keeps hashing cost predictable. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password rules, shared by the sign-up checklist in the UI and the API validation.
 * Labels match the Connexion design.
 */
export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH} characters`,
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'number', label: 'A number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'A symbol', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]['id'];

export function isInstituteEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${INSTITUTE_EMAIL_DOMAIN}`);
}

/** Any email, normalised: trimmed and lowercased. Used for sign-in and "forgot password". */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address' }).max(254));

export const InstituteEmailSchema = EmailSchema.refine(isInstituteEmail, {
  message: `Use your @${INSTITUTE_EMAIL_DOMAIN} address`,
});

export const NewPasswordSchema = z
  .string()
  .max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`)
  .superRefine((value, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value)) {
        ctx.addIssue({ code: 'custom', message: `Password needs: ${rule.label.toLowerCase()}` });
      }
    }
  });

const NameSchema = z.string().trim().min(1, 'Required').max(80);

export const SignUpSchema = z.object({
  firstName: NameSchema,
  lastName: NameSchema,
  email: InstituteEmailSchema,
  password: NewPasswordSchema,
  /** Optional consent: ticked makes the profile visible to other students. */
  profileVisible: z.boolean().default(false),
});
export type SignUpInput = z.input<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Required').max(PASSWORD_MAX_LENGTH),
  remember: z.boolean().default(false),
});
export type SignInInput = z.input<typeof SignInSchema>;

export const EmailOnlySchema = z.object({ email: EmailSchema });
export type EmailOnlyInput = z.infer<typeof EmailOnlySchema>;

/** Tokens are 32 random bytes, base64url-encoded (43 characters). */
export const TokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid or incomplete link');

export const VerifyEmailSchema = z.object({ token: TokenSchema });
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const ResetPasswordSchema = z.object({ token: TokenSchema, password: NewPasswordSchema });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ROLES = ['student', 'staff', 'admin'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const CurrentUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: RoleSchema,
  profileVisible: z.boolean(),
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/** Neutral acknowledgement for endpoints that must not reveal whether an account exists. */
export const AcceptedSchema = z.object({ status: z.literal('accepted') });
export type Accepted = z.infer<typeof AcceptedSchema>;

/** Problem types the auth screens react to (in addition to validation errors). */
export const AUTH_PROBLEM = {
  invalidCredentials: 'urn:tekcert:problem:invalid-credentials',
  locked: 'urn:tekcert:problem:account-locked',
  emailNotVerified: 'urn:tekcert:problem:email-not-verified',
  invalidToken: 'urn:tekcert:problem:invalid-token',
  unauthenticated: 'urn:tekcert:problem:unauthenticated',
} as const;

/** Login attempts allowed before the lockout. */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
/** Minimum delay between two emails of the same kind (the "Resend in 0:58" timer). */
export const RESEND_COOLDOWN_SECONDS = 60;
