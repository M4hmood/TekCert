import { Badge as BadgeBase } from './ui/badge';

export interface BadgeProps {
  count: number;
  /** Spoken text, e.g. "3 unread". The visible count is hidden from screen readers. */
  label: string;
}

export function Badge({ count, label }: BadgeProps) {
  return (
    <BadgeBase>
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </BadgeBase>
  );
}
