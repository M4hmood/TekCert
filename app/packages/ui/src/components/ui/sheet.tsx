'use client';

import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { useReturnFocus } from '../../lib/use-return-focus';
import { cn } from '../../lib/utils';

export function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

/** Slides up from the bottom of the screen, the only placement the designs use. */
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content>) {
  const returnFocus = useReturnFocus();
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-[rgba(19,26,44,0.5)] data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onCloseAutoFocus={returnFocus}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[20px] bg-bg text-ink data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300',
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(className)} {...props} />;
}
