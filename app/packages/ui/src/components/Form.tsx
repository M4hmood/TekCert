'use client';

import { type InputHTMLAttributes, type ReactNode, useId, useState } from 'react';
import { cx } from '../cx';
import styles from './Form.module.css';
import { Icon } from './Icon';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Shown under the input in red; also marks the input invalid. */
  error?: string;
  /** Shown under the input in green when there is no error (e.g. "Institute address recognised"). */
  success?: string;
  /** Element placed on the right of the label row (e.g. a "Forgot password?" link). */
  labelAction?: ReactNode;
  /** Extra content under the input, such as a live checklist. */
  children?: ReactNode;
}

/** Labelled text input with its error message wired through aria-describedby. */
export function Field({
  label,
  error,
  success,
  labelAction,
  children,
  className,
  'aria-describedby': describedBy,
  ...input
}: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds(error || success ? messageId : undefined, describedBy)}
        {...input}
      />
      <FieldMessage id={messageId} error={error} success={success} />
      {children}
    </div>
  );
}

export interface PasswordFieldProps extends Omit<FieldProps, 'type'> {
  /** Set false to hide the show/hide button. */
  revealable?: boolean;
}

/** Password input with the eye button from the design. */
export function PasswordField({
  label,
  error,
  success,
  labelAction,
  children,
  className,
  revealable = true,
  'aria-describedby': describedBy,
  ...input
}: PasswordFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {labelAction}
      </div>
      <span className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds(error || success ? messageId : undefined, describedBy)}
          {...input}
        />
        {revealable && (
          <button
            type="button"
            className={styles.reveal}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            <Icon name={visible ? 'visibility_off' : 'visibility'} size={20} />
          </button>
        )}
      </span>
      <FieldMessage id={messageId} error={error} success={success} />
      {children}
    </div>
  );
}

function describedByIds(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

function FieldMessage({ id, error, success }: { id: string; error?: string; success?: string }) {
  if (error) {
    return (
      <span id={id} role="alert" className={cx(styles.message, styles.error)}>
        <Icon name="error" size={17} />
        {error}
      </span>
    );
  }
  if (success) {
    return (
      <span id={id} className={cx(styles.message, styles.success)}>
        <Icon name="check_circle" size={17} />
        {success}
      </span>
    );
  }
  return null;
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
}

export function Checkbox({ children, className, ...input }: CheckboxProps) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input type="checkbox" {...input} />
      <span className={styles.box} aria-hidden>
        <Icon name="check" size={18} />
      </span>
      <span>{children}</span>
    </label>
  );
}

export type AlertTone = 'error' | 'info' | 'success';

const ALERT_ICON: Record<AlertTone, string> = {
  error: 'error',
  info: 'info',
  success: 'check_circle',
};
const ALERT_CLASS: Record<AlertTone, string | undefined> = {
  error: styles.alertError,
  info: styles.alertInfo,
  success: styles.alertSuccess,
};

/** Inline message box; errors are announced to screen readers immediately. */
export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(styles.alert, ALERT_CLASS[tone])}
    >
      <Icon name={ALERT_ICON[tone]} className={styles.alertIcon} />
      <span>{children}</span>
    </div>
  );
}
