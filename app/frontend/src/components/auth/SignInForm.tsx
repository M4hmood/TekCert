'use client';

import {
  AUTH_PROBLEM,
  CurrentUserSchema,
  INSTITUTE_EMAIL_DOMAIN,
  isInstituteEmail,
  LOCKOUT_MINUTES,
  type ProblemDetails,
} from '@tekcert/types';
import { Alert, Button, Checkbox, cx, Field, PasswordField } from '@tekcert/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { postJson, safeNextPath } from '@/lib/client-api';
import styles from './auth.module.css';
import { CheckInbox } from './CheckInbox';

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resentTo, setResentTo] = useState<string | null>(null);

  const resendVerification = async () => {
    await postJson('/auth/resend-verification', { email });
  };

  if (resentTo) return <CheckInbox email={resentTo} onResend={resendVerification} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isInstituteEmail(email)) {
      setEmailError(`Use your @${INSTITUTE_EMAIL_DOMAIN} address`);
      return;
    }
    setSubmitting(true);
    setProblem(null);
    const result = await postJson(
      '/auth/sign-in',
      { email, password, remember },
      CurrentUserSchema,
    );
    if (result.ok) {
      router.replace(safeNextPath(next));
      router.refresh();
      return;
    }
    setProblem(result.problem);
    setSubmitting(false);
  };

  const wrongCredentials = problem?.type === AUTH_PROBLEM.invalidCredentials;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.heading}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in with your institute account.</p>
      </div>

      {problem && (
        <SignInProblem
          problem={problem}
          onResend={async () => {
            await resendVerification();
            setResentTo(email);
          }}
        />
      )}

      <Field
        label="Institute email"
        type="email"
        name="email"
        autoComplete="username"
        placeholder={`firstname.lastname@${INSTITUTE_EMAIL_DOMAIN}`}
        value={email}
        error={emailError}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(undefined);
        }}
        required
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={wrongCredentials || undefined}
        labelAction={
          <Link href="/forgot-password" className={styles.textLink}>
            Forgot password?
          </Link>
        }
        required
      />
      <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
        Stay signed in on this device
      </Checkbox>
      <Button type="submit" className={cx(styles.submit)} disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function SignInProblem({
  problem,
  onResend,
}: {
  problem: ProblemDetails;
  onResend: () => Promise<void>;
}) {
  switch (problem.type) {
    case AUTH_PROBLEM.invalidCredentials: {
      const left = problem.attemptsLeft ?? 0;
      return (
        <Alert tone="error">
          <strong>Incorrect email or password.</strong> You have {left}{' '}
          {left === 1 ? 'attempt' : 'attempts'} left before a {LOCKOUT_MINUTES}-minute lockout.
        </Alert>
      );
    }
    case AUTH_PROBLEM.locked: {
      const minutes = Math.max(1, Math.ceil((problem.retryAfterSeconds ?? 60) / 60));
      return (
        <Alert tone="error">
          <strong>Too many attempts.</strong> Try again in {minutes}{' '}
          {minutes === 1 ? 'minute' : 'minutes'}.
        </Alert>
      );
    }
    case AUTH_PROBLEM.emailNotVerified:
      return (
        <Alert tone="info">
          <strong>Confirm your email first.</strong> Open the link we sent to your institute
          address.{' '}
          <button type="button" className={styles.textLink} onClick={() => void onResend()}>
            Resend link
          </button>
        </Alert>
      );
    default:
      return (
        <Alert tone="error">
          <strong>{problem.title}.</strong> {problem.detail ?? 'Please try again.'}
        </Alert>
      );
  }
}
