import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Icon } from './Icon';
import { Button as ButtonBase, buttonVariants, iconButtonVariants } from './ui/button';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

/** Class names for anything styled as a button, including links (e.g. next/link). */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cn(buttonVariants({ variant, size }));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  children: ReactNode;
}

export function Button({ icon, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <ButtonBase type={type} {...rest}>
      {icon && <Icon name={icon} size={19} />}
      {children}
    </ButtonBase>
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
      className={cn(iconButtonVariants({ variant }), className)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
