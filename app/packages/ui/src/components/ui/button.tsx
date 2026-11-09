import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 h-(--control-height) px-4.5 border-[1.5px] border-transparent rounded-field text-[14.5px] font-semibold no-underline whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-pri text-pri-ink',
        secondary: 'border-ln2 bg-sf text-ink hover:bg-sf2',
        ghost: 'bg-transparent text-ink2 hover:bg-sf2 hover:text-ink',
      },
      size: {
        md: '',
        sm: 'h-(--control-height-sm) px-3.5 text-[13.5px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export const iconButtonVariants = cva(
  'inline-grid place-items-center flex-none size-(--touch-target) p-0 border-[1.5px] border-transparent rounded-field bg-transparent text-ink2 cursor-pointer hover:bg-sf2 hover:text-ink',
  {
    variants: {
      variant: {
        plain: '',
        outlined: 'border-ln2 bg-sf',
      },
    },
    defaultVariants: { variant: 'plain' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
