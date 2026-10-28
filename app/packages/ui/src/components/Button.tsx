import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Button.module.css';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

/** Class names for anything styled as a button, including links (e.g. next/link). */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cx(styles.button, styles[variant], size === 'sm' && styles.sm);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(buttonClass(variant, size), className)} {...rest}>
      {icon && <Icon name={icon} size={19} />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  /** Icon to show; omit to pass custom icon children (e.g. one glyph per theme). */
  icon?: string;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: 'plain' | 'outlined';
  children?: ReactNode;
}

export function IconButton({
  icon,
  label,
  variant = 'plain',
  className,
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, variant === 'outlined' && styles.outlined, className)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
