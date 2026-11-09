'use client';

import { INSTITUTE_EMAIL_DOMAIN, InstituteEmailSchema } from '@tekcert/types';
import { Button, Field, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { postJson } from '@/lib/client-api';
import { CheckInbox } from './CheckInbox';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = (address: string) => postJson('/auth/forgot-password', { email: address });

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        validity="valid for 30 minutes"
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
    setSubmitting(true);
    // The API answers the same whether or not the account exists.
    await send(parsed.data);
    setSentTo(parsed.data);
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Link
        href="/sign-in"
        className="inline-flex items-center self-start gap-1.5 min-h-11 text-pri text-[14.5px] font-semibold no-underline"
      >
        <Icon name="arrow_back" size={20} />
        Back to sign in
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[38px] font-medium tracking-heading leading-[1.1] max-lg:text-[30px]">
          Forgot password
        </h1>
        <p className="text-ink2 text-[15.5px] leading-[1.55]">
          We&apos;ll send you a reset link that&apos;s valid for 30 minutes.
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
      <Button type="submit" className="h-13 rounded-[10px] text-[16px]" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send link'}
      </Button>
    </form>
  );
}
