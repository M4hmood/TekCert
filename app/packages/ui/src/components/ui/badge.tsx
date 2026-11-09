import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-grid place-items-center min-w-5.5 h-5.5 px-1.5 rounded-[11px] bg-pri text-pri-ink text-[12px] font-semibold',
        className,
      )}
      {...props}
    />
  );
}
