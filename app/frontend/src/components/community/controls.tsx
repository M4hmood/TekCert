'use client';

import type { CommunitySpecialtyFilter } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';

/** Filter controls shared by the desktop bar and the phone's sheet. */

export const specialtyChipLabel = (code: CommunitySpecialtyFilter) =>
  code === 'none' ? 'No specialty yet' : code;

export function HelpToggle({
  on,
  onToggle,
  className,
}: {
  on: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 h-11.5 px-3.5 border-[1.5px] border-ln2 rounded-[10px] bg-sf text-[14.5px] font-semibold cursor-pointer',
        on && 'border-ok bg-ok-sf text-ok',
        className,
      )}
    >
      <Icon name="volunteer_activism" size={19} />
      Available to help
    </button>
  );
}
