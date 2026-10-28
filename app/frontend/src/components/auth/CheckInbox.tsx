'use client';

import { RESEND_COOLDOWN_SECONDS } from '@tekcert/types';
import { Button, buttonClass, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './auth.module.css';

export interface CheckInboxProps {
  email: string;
  /** Sends the email again. The server applies the same one-minute cooldown. */
  onResend: () => Promise<void>;
  /** e.g. "valid for 30 minutes" for reset links. */
  validity?: string;
}

/** "Check your inbox" with the "Resend in 0:58" countdown from the design. */
export function CheckInbox({ email, onResend, validity }: CheckInboxProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async () => {
    setSending(true);
    await onResend();
    setSending(false);
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div className={styles.result}>
      <span className={styles.resultIcon}>
        <Icon name="mark_email_read" size={32} />
      </span>
      <h1 className={styles.title}>Check your inbox</h1>
      <p className={styles.resultText} role="status">
        A link{validity ? ` ${validity}` : ''} was sent to <strong>{email}</strong>. Remember to
        check your spam folder.
      </p>
      <div className={styles.actions}>
        <Link href="/sign-in" className={buttonClass('secondary')}>
          Back to sign in
        </Link>
        {secondsLeft > 0 ? (
          <Button variant="ghost" disabled aria-live="polite">
            Resend in {formatCountdown(secondsLeft)}
          </Button>
        ) : (
          <Button variant="ghost" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : 'Resend link'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
