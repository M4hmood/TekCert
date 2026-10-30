'use client';

import {
  INSTITUTE_EMAIL_DOMAIN,
  InstituteEmailSchema,
  type ProblemDetails,
  SignUpSchema,
} from '@tekcert/types';
import { Alert, Button, Checkbox, Field, PasswordField } from '@tekcert/ui';
import { type FormEvent, useId, useState } from 'react';
import { postJson } from '@/lib/client-api';
import styles from './auth.module.css';
import { CheckInbox } from './CheckInbox';
import { PasswordChecklist } from './PasswordChecklist';

type FieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'acceptVisibility';
type Errors = Partial<Record<FieldName, string>>;

export function SignUpForm() {
  const checklistId = useId();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [acceptVisibility, setAcceptVisibility] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        validity="valid for 24 hours"
        onResend={async () => {
          await postJson('/auth/resend-verification', { email: sentTo });
        }}
      />
    );
  }

  const update = (name: Exclude<FieldName, 'acceptVisibility'>, value: string) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = SignUpSchema.safeParse({ ...form, acceptVisibility });
    if (!parsed.success) {
      setErrors(firstErrorPerField(parsed.error.issues));
      return;
    }
    setSubmitting(true);
    setProblem(null);
    const result = await postJson('/auth/sign-up', parsed.data);
    setSubmitting(false);
    if (result.ok) {
      setSentTo(parsed.data.email);
    } else if (result.problem.errors?.length) {
      setErrors(firstErrorPerField(result.problem.errors.map((e) => ({ ...e, path: [e.path] }))));
    } else {
      setProblem(result.problem);
    }
  };

  const emailRecognised = !errors.email && InstituteEmailSchema.safeParse(form.email).success;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.heading}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>For students enrolled at TEK-UP only.</p>
      </div>

      {problem && (
        <Alert tone="error">
          <strong>{problem.title}.</strong> {problem.detail ?? 'Please try again.'}
        </Alert>
      )}

      <div className={styles.names}>
        <Field
          label="First name"
          name="firstName"
          autoComplete="given-name"
          value={form.firstName}
          error={errors.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          required
        />
        <Field
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          value={form.lastName}
          error={errors.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          required
        />
      </div>
      <Field
        label="Institute email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder={`firstname.lastname@${INSTITUTE_EMAIL_DOMAIN}`}
        value={form.email}
        error={errors.email}
        success={emailRecognised ? 'Institute address recognised' : undefined}
        onChange={(e) => update('email', e.target.value)}
        required
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        value={form.password}
        error={errors.password}
        onChange={(e) => update('password', e.target.value)}
        aria-describedby={checklistId}
        required
      >
        <PasswordChecklist id={checklistId} password={form.password} />
      </PasswordField>
      {/* Required: every profile is visible to signed-in students (PLAN.md, 2026-10-29). */}
      <Checkbox
        className={styles.consent}
        checked={acceptVisibility}
        error={errors.acceptVisibility}
        onChange={(e) => {
          setAcceptVisibility(e.target.checked);
          setErrors((current) => ({ ...current, acceptVisibility: undefined }));
        }}
        required
      >
        I understand that my name, class, certifications and institute email are visible to TEK-UP
        students.
      </Checkbox>
      <Button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Creating your account…' : 'Create my account'}
      </Button>
      <p className={styles.footnote}>A confirmation link will be sent to your institute address.</p>
    </form>
  );
}

function firstErrorPerField(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const errors: Errors = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as FieldName;
    errors[field] ??= issue.message;
  }
  return errors;
}
