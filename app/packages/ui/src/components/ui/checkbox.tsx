'use client';

import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../Icon';

export function Checkbox({
  className,
  iconSize = 18,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { iconSize?: number }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'grid place-items-center flex-none size-5.5 border-[1.5px] border-ln2 rounded-[6px] bg-sf text-pri-ink cursor-pointer aria-invalid:border-err data-[state=checked]:border-pri data-[state=checked]:bg-pri',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        <Icon name="check" size={iconSize} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
