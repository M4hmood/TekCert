'use client';

import { useState } from 'react';

/**
 * For dialogs opened from state rather than a Radix trigger: Radix returns focus to its trigger
 * on closing, so without one the focus would be lost. Pass the result as onCloseAutoFocus.
 */
export function useReturnFocus() {
  const [previous] = useState(() =>
    typeof document === 'undefined' ? null : document.activeElement,
  );
  return (event: Event) => {
    event.preventDefault();
    if (previous instanceof HTMLElement) previous.focus();
  };
}
