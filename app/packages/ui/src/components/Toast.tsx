import { cn } from '../lib/utils';
import { Icon } from './Icon';

export interface ToastProps {
  message: string;
  /** `error` swaps the gold check for a red error icon. */
  tone?: 'success' | 'error';
  /** An optional button after the message, e.g. Undo. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * The design's toast: dark pill at the bottom centre, above the phone tab bar. Announced
 * politely to screen readers (role="status").
 */
export function Toast({ message, tone = 'success', action, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-7 start-1/2 z-30 flex items-center gap-3 py-3 ps-4.5 pe-3 rounded-[12px] bg-ink text-bg text-[14.5px] shadow-elevated -translate-x-1/2 animate-toast-in motion-reduce:animate-none max-md:bottom-[calc(var(--bottom-nav-height)+16px)] max-md:w-max max-md:max-w-[calc(100vw-32px)]',
        !action && 'pe-4.5',
        className,
      )}
    >
      <Icon
        name={tone === 'error' ? 'error' : 'check_circle'}
        size={22}
        filled
        className={tone === 'error' ? 'text-err-sf' : 'text-gold-fill'}
      />
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-9 px-3 rounded-[8px] border-none bg-transparent text-bg text-[14px] font-semibold underline underline-offset-3 cursor-pointer hover:no-underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
