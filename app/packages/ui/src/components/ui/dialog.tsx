'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { useReturnFocus } from '../../lib/use-return-focus';
import { cn } from '../../lib/utils';

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  const returnFocus = useReturnFocus();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-[rgb(13_18_32/55%)] data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onCloseAutoFocus={returnFocus}
        className={cn(
          'fixed inset-0 z-50 m-auto h-fit max-w-[calc(100%-6px-2em)] max-h-[calc(100%-6px-2em)] overflow-auto p-6 border border-ln rounded-card bg-sf text-ink shadow-elevated outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn(className)} {...props} />;
}
