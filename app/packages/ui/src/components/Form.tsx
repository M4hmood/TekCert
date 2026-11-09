'use client';

import {
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { cn } from '../lib/utils';
import { Icon } from './Icon';
import { Alert as AlertBase } from './ui/alert';
import { Checkbox as CheckboxBase } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';

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

function LabelRow({ id, label, action }: { id: string; label: string; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      {action}
    </div>
  );
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
    <div className={cn('flex flex-col gap-1.75 min-w-0', className)}>
      <LabelRow id={id} label={label} action={labelAction} />
      <Input
        id={id}
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
    <div className={cn('flex flex-col gap-1.75 min-w-0', className)}>
      <LabelRow id={id} label={label} action={labelAction} />
      <span className="relative flex">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          className="pe-13"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds(error || success ? messageId : undefined, describedBy)}
          {...input}
        />
        {revealable && (
          <button
            type="button"
            className="absolute top-0.5 end-0.5 grid place-items-center size-11 rounded-field text-ink3 cursor-pointer"
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
      <span id={id} role="alert" className="flex items-center gap-1.5 text-[13px] text-err">
        <Icon name="error" size={17} />
        {error}
      </span>
    );
  }
  if (success) {
    return (
      <span id={id} className="flex items-center gap-1.5 text-[13px] text-ok">
        <Icon name="check_circle" size={17} />
        {success}
      </span>
    );
  }
  return null;
}

export interface CheckboxProps extends Omit<
  ComponentProps<typeof CheckboxBase>,
  'checked' | 'children' | 'onCheckedChange'
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  /** Shown under the box in red, e.g. for a box that must be ticked. */
  error?: string;
}

export function Checkbox({
  children,
  className,
  error,
  checked,
  onCheckedChange,
  ...box
}: CheckboxProps) {
  const messageId = `${useId()}-message`;
  // Same element tree with or without an error, so the box keeps its focus and identity.
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <label className="flex items-start gap-2.5 min-h-11 py-2.75 text-[15px] leading-[1.5] cursor-pointer">
        <CheckboxBase
          className="mt-px"
          checked={checked}
          onCheckedChange={(state) => onCheckedChange(state === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          {...box}
        />
        <span>{children}</span>
      </label>
      <FieldMessage id={messageId} error={error} />
    </div>
  );
}

export type AlertTone = 'error' | 'info' | 'success';

const ALERT_ICON: Record<AlertTone, string> = {
  error: 'error',
  info: 'info',
  success: 'check_circle',
};

/** Inline message box; errors are announced to screen readers immediately. */
export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <AlertBase role={tone === 'error' ? 'alert' : 'status'} variant={tone}>
      <Icon name={ALERT_ICON[tone]} size={20} className="flex-none" />
      <span>{children}</span>
    </AlertBase>
  );
}
