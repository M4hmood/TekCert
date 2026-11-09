import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** A span, so it can stand in for inline content. The screen around it shimmers as one. */
export function Skeleton({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span data-slot="skeleton" className={cn('block rounded-[5px] bg-sf2', className)} {...props} />
  );
}
