'use client';

import { Progress as ProgressPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** Radix's accessible progress bar. The children draw it, so a design can use segments. */
export function Progress({ className, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return <ProgressPrimitive.Root data-slot="progress" className={cn(className)} {...props} />;
}
