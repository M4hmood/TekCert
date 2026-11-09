'use client';

import { Toggle as TogglePrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive.Root>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(className)} {...props} />;
}
