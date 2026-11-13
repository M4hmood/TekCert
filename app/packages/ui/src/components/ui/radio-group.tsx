'use client';

import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn(className)} {...props} />;
}

/**
 * One choice. The designs draw each as a whole card, so the item is the card itself: style it
 * with `data-[state=checked]:…` and put the label inside.
 */
export function RadioGroupItem({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn('group/radio cursor-pointer text-start', className)}
      {...props}
    />
  );
}

/** The design's radio mark: a ring that fills when its item is chosen. */
export function RadioMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center size-5 border-2 border-ln2 rounded-full group-data-[state=checked]/radio:border-pri',
        className,
      )}
    >
      <span className="size-2.5 rounded-full bg-transparent group-data-[state=checked]/radio:bg-pri" />
    </span>
  );
}
