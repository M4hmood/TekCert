'use client';

import { useRef } from 'react';

/**
 * For dialogs opened from state rather than a Radix trigger: Radix returns focus to its trigger
 * on closing, so without one the focus would be lost. Spread the result on the content.
 *
 * The element to go back to is read when the dialog opens, not when the component first
 * renders: a dialog's content component is rendered (closed) long before anyone opens it.
 */
export function useReturnFocus() {
  const previous = useRef<Element | null>(null);
  return {
    onOpenAutoFocus: () => {
      // Called before Radix moves the focus inside: this is still what opened the dialog.
      previous.current = document.activeElement;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const target = previous.current;
      previous.current = null;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    },
  };
}
