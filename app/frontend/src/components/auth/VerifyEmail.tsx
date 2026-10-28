'use client';

import { CurrentUserSchema, INSTITUTE_EMAIL_DOMAIN, InstituteEmailSchema } from '@tekcert/types';
import { Button, Field, Icon } from '@tekcert/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { postJson } from '@/lib/client-api';
import styles from './auth.module.css';
import { CheckInbox } from './CheckInbox';

type State = 'verifying' | 'verified' | 'invalid';

/**
 * Landing page of the verification email. The token is sent with a POST from the page, never by
 * opening the link itself, so mail scanners that prefetch links can't use it up.
 */
export function VerifyEmail({ token }: { token: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>(token ? 'verifying' : 'invalid');
  const started = useRef(false);

  useEffect(() => {
    // Effects run twice in development; the token is single-use, so send it once.
    if (!token || started.current) return;
    started.current = true;
    void postJson('/auth/verify-email', { token }, CurrentUserSchema).then((result) => {
      if (!result.ok) {
        setState('invalid');
        return;
      }
      setState('verified');
      router.replace('/dashboard');
      router.refresh();
    });
  }, [token, router]);

  if (state === 'invalid') return <ExpiredLink />;

  return (
    <div className={styles.result} role="status">
      <span className={styles.resultIcon}>
        <Icon name={state === 'verified' ? 'verified' : 'hourglass_top'} size={32} />
      </span>
      <h1 className={styles.title}>
        {state === 'verified' ? 'Address confirmed' : 'Confirming your address…'}
      </h1>
      <p className={styles.resultText}>
        {state === 'verified' ? 'Opening TekCert…' : 'This only takes a moment.'}
      </p>
    </div>
  );
}

/** Expired or used link: ask for a new one. */
function ExpiredLink() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = (address: string) => postJson('/auth/resend-verification', { email: address });

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        validity="valid for 24 hours"
        onResend={async () => {
          await send(sentTo);
        }}
      />
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = InstituteEmailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    await send(parsed.data);
    setSentTo(parsed.data);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <span className={styles.resultIcon} data-tone="error">
        <Icon name="link_off" size={32} />
      </span>
      <div className={styles.heading}>
        <h1 className={styles.title}>This link has expired</h1>
        <p className={styles.subtitle}>
          Confirmation links are valid for 24 hours and work once. Enter your institute email to get
          a new one.
        </p>
      </div>
      <Field
        label="Institute email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder={`firstname.lastname@${INSTITUTE_EMAIL_DOMAIN}`}
        value={email}
        error={error}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(undefined);
        }}
        required
      />
      <Button type="submit" className={styles.submit}>
        Send a new link
      </Button>
    </form>
  );
}
