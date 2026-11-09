import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const alertVariants = cva(
  'flex gap-2.5 py-3 px-3.5 rounded-[10px] text-[14px] leading-[1.45]',
  {
    variants: {
      variant: {
        error: 'bg-err-sf text-err',
        info: 'bg-pri-sf text-pri',
        success: 'bg-ok-sf text-ok',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
