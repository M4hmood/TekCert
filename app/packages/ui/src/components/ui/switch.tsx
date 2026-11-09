'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** A 44 × 26 px track. The ::after box extends the touch target to 44 px tall. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative flex-none w-11 h-6.5 mx-1 rounded-[13px] bg-ln2 cursor-pointer transition-[background] duration-200 after:absolute after:-inset-x-1 after:-inset-y-2.25 after:content-[''] data-[state=checked]:bg-pri",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-5 ms-0.75 rounded-full bg-sf transition-transform duration-200 data-[state=checked]:translate-x-4.5"
      />
    </SwitchPrimitive.Root>
  );
}
