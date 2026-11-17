import { cn, Icon } from '@tekcert/ui';
import type { ReactNode } from 'react';

export interface StatusScreenProps {
  icon: string;
  /** `error` tints the icon red, as the dashboard's error state does (design/Tableau-de-bord). */
  tone?: 'error' | 'neutral';
  /** A short label above the title: "Error 404". */
  eyebrow?: ReactNode;
  title: string;
  children: ReactNode;
  /** The buttons; they stack full width on phones. */
  actions: ReactNode;
  /** A line under the buttons, for support: the error code and the time. */
  footnote?: ReactNode;
}

/**
 * A screen that is only a message: something went wrong, page not found. The icon sits on two
 * faint rings and the parts rise in one after the other (no motion when reduced motion is on).
 * It fills its flex parent, so it works on its own page and inside the shell.
 */
export function StatusScreen({
  icon,
  tone = 'neutral',
  eyebrow,
  title,
  children,
  actions,
  footnote,
}: StatusScreenProps) {
  return (
    <section
      aria-labelledby="status-title"
      className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center max-md:py-12"
    >
      <div
        className="relative mb-5 grid place-items-center size-44 animate-auth-enter max-md:size-36"
        aria-hidden="true"
      >
        <span className="absolute size-44 rounded-full border border-ln max-md:size-36" />
        <span className="absolute size-30 rounded-full border border-ln2 max-md:size-26" />
        <span
          className={cn(
            'relative grid place-items-center size-18 rounded-full',
            tone === 'error' ? 'bg-err-sf text-err' : 'bg-sf2 text-ink2',
          )}
        >
          <Icon name={icon} size={34} />
        </span>
      </div>

      {eyebrow && (
        <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink3 animate-auth-enter [animation-delay:40ms]">
          {eyebrow}
        </p>
      )}
      <h1
        id="status-title"
        className="max-w-140 font-serif text-[36px] font-semibold leading-[1.15] text-balance animate-auth-enter [animation-delay:60ms] max-md:text-[28px]"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-110 text-ink2 text-[15.5px] leading-[1.6] text-pretty animate-auth-enter [animation-delay:100ms]">
        {children}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3 animate-auth-enter [animation-delay:140ms] max-sm:w-full max-sm:max-w-80 max-sm:flex-col">
        {actions}
      </div>

      {footnote && (
        <p className="mt-6 font-mono text-[12px] text-ink3 animate-auth-enter [animation-delay:180ms]">
          {footnote}
        </p>
      )}
    </section>
  );
}
