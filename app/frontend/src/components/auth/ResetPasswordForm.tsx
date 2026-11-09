'use client';

import { AUTH_PROBLEM, NewPasswordSchema } from '@tekcert/types';
import { Alert, Button, buttonClass, Icon, PasswordField } from '@tekcert/ui';
import Link from 'next/link';
import { type FormEvent, useId, useState } from 'react';
import { postJson } from '@/lib/client-api';
import { PasswordChecklist } from './PasswordChecklist';

type State = 'form' | 'done' | 'invalid';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const checklistId = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [state, setState] = useState<State>(token ? 'form' : 'invalid');
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state === 'done') {
    return (
      <div className="flex flex-col items-start gap-5 animate-auth-enter">
        <span className="grid place-items-center size-16 rounded-full bg-ok-sf text-ok data-[tone=error]:bg-err-sf data-[tone=error]:text-err">
          <Icon name="lock_reset" size={32} />
        </span>
        <h1 className="font-serif text-[38px] font-medium tracking-heading leading-[1.1] max-lg:text-[30px]">
          Password changed
        </h1>
        <p className="text-ink2 text-[15.5px] leading-[1.6] [&_strong]:text-ink" role="status">
          Your new password is saved, and you were signed out on every device.
        </p>
        <Link href="/sign-in" className={buttonClass('primary')}>
          Sign in
        </Link>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="flex flex-col items-start gap-5 animate-auth-enter">
        <span
          className="grid place-items-center size-16 rounded-full bg-ok-sf text-ok data-[tone=error]:bg-err-sf data-[tone=error]:text-err"
          data-tone="error"
        >
          <Icon name="link_off" size={32} />
        </span>
        <h1 className="font-serif text-[38px] font-medium tracking-heading leading-[1.1] max-lg:text-[30px]">
          This link has expired
        </h1>
        <p className="text-ink2 text-[15.5px] leading-[1.6] [&_strong]:text-ink">
          Reset links are valid for 30 minutes and work once. Ask for a new one.
        </p>
        <Link href="/forgot-password" className={buttonClass('primary')}>
          Ask for a new link
        </Link>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = NewPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    setFailure(null);
    const result = await postJson('/auth/reset-password', { token, password });
    setSubmitting(false);
    if (result.ok) setState('done');
    else if (result.problem.type === AUTH_PROBLEM.invalidToken) setState('invalid');
    else setFailure(result.problem.detail ?? result.problem.title);
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[38px] font-medium tracking-heading leading-[1.1] max-lg:text-[30px]">
          Choose a new password
        </h1>
        <p className="text-ink2 text-[15.5px] leading-[1.55]">
          You will be signed out on every device.
        </p>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        value={password}
        error={error}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(undefined);
        }}
        aria-describedby={checklistId}
        required
      >
        <PasswordChecklist id={checklistId} password={password} />
      </PasswordField>
      <Button type="submit" className="h-13 rounded-[10px] text-[16px]" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}
