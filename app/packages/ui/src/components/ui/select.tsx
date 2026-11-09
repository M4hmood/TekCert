'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../Icon';

export function Select(props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

export function SelectValue(props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'group/select flex items-center gap-2 w-full min-w-[var(--select-min-width,0)] h-[var(--select-height,46px)] ps-3.5 pe-2.5 border-[1.5px] border-ln2 rounded-[10px] bg-sf text-[14.5px] whitespace-nowrap cursor-pointer transition-[border-color] duration-150 hover:border-ink3 data-[state=open]:border-pri',
        className,
      )}
      {...props}
    >
      {children}
      <Icon
        name="expand_more"
        size={20}
        className="ms-auto text-ink3 transition-[rotate] duration-150 group-data-[state=open]/select:rotate-180"
      />
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'start',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-max min-w-(--radix-select-trigger-width) max-w-[calc(100vw-32px)] max-h-(--radix-select-content-available-height) overflow-y-auto p-1.25 border border-ln rounded-[12px] bg-sf shadow-elevated data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 duration-[120ms]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'flex items-center justify-between gap-5 min-h-10 ps-3 pe-2.5 rounded-[8px] text-[14.5px] font-medium whitespace-nowrap cursor-pointer outline-none select-none data-[highlighted]:bg-sf2 data-[state=checked]:text-pri data-[state=checked]:font-semibold pointer-coarse:min-h-(--touch-target)',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="grid place-items-center">
        <Icon name="check" size={18} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
