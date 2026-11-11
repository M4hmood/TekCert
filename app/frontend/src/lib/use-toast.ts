'use client';

import type { ToastProps } from '@tekcert/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastState = Pick<ToastProps, 'message' | 'tone' | 'action'> & { id: number };

/** How long a toast stays; one with an action (Undo) stays a little longer. */
const DURATION_MS = 2800;
const WITH_ACTION_MS = 5000;

/** One toast at a time: a new one replaces the last and restarts the timer. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const next = useRef(0);

  const show = useCallback((message: string, options: Omit<ToastState, 'id' | 'message'> = {}) => {
    next.current += 1;
    setToast({ id: next.current, message, ...options });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? WITH_ACTION_MS : DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, show, dismiss };
}
