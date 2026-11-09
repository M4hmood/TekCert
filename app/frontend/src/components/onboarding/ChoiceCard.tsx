import { cn, Icon } from '@tekcert/ui';
import type { CSSProperties, ReactNode } from 'react';

export interface ChoiceCardProps {
  /** The big serif label: "ING-4", "CIM", "Undecided". */
  code: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Shorter title for phone rows. */
  shortTitle?: string;
  /** Specialty colour: tints the dot, the border and the background when selected. */
  colour?: string;
  /** Dashed outline for the "Undecided" option. */
  dashed?: boolean;
  size: 'year' | 'specialty' | 'target';
  selected: boolean;
  onSelect: () => void;
}

const SIZES = {
  year: { card: 'min-h-37.5', code: 'text-[32px] font-medium', title: 'text-[14px]', dot: '' },
  specialty: {
    card: 'min-h-35 p-5 aria-pressed:p-4.75',
    code: 'text-[26px]',
    title: '',
    dot: '',
  },
  target: {
    card: 'gap-2 min-h-29.5 p-4 aria-pressed:p-3.75',
    code: 'gap-2 text-[22px]',
    title: 'text-ink2 text-[13.5px] font-medium',
    dot: 'size-3',
  },
};

/** One option in a single-choice grid (aria-pressed, as in the design). */
export function ChoiceCard({
  code,
  title,
  description,
  shortTitle,
  colour,
  dashed = false,
  size,
  selected,
  onSelect,
}: ChoiceCardProps) {
  const style = colour ? ({ '--choice': colour } as CSSProperties) : undefined;
  const sized = SIZES[size];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={style}
      className={cn(
        'group/choice [--choice:var(--pri)] flex flex-col gap-2.5 py-5 px-4.5 border border-ln2 rounded-card bg-sf text-ink text-start cursor-pointer hover:border-ink3 aria-pressed:py-4.75 aria-pressed:px-4.25 aria-pressed:border-2 aria-pressed:border-(--choice) aria-pressed:bg-pri-sf',
        sized.card,
        colour && 'aria-pressed:bg-[color-mix(in_oklch,var(--choice)_12%,var(--sf))]',
        dashed && 'border-dashed',
        // Phone rows: dot, code, short name, check.
        'max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:items-center max-md:gap-3 max-md:min-h-12 max-md:py-0 max-md:px-3.5 max-md:rounded-[12px] max-md:aria-pressed:py-0 max-md:aria-pressed:px-3.25',
      )}
    >
      <span className="flex items-center justify-between w-full max-md:contents">
        <span
          className={cn(
            'flex items-center gap-2.5 font-serif font-semibold',
            sized.code,
            'max-md:col-1 max-md:gap-3 max-md:min-w-19 max-md:text-[18px] max-md:font-semibold',
          )}
        >
          {(colour || dashed) && (
            <span
              className={cn(
                'flex-none size-3.5 rounded-full bg-(--choice)',
                sized.dot,
                dashed && 'bg-transparent',
              )}
              aria-hidden
            />
          )}
          {code}
        </span>
        <Icon
          name={selected ? 'check_circle' : 'radio_button_unchecked'}
          filled={selected}
          className="text-ln2 text-[22px] group-aria-pressed/choice:text-pri max-md:col-3 max-md:row-1 max-md:text-[20px]"
        />
      </span>
      {title && (
        <span
          className={cn(
            'text-[14.5px] font-semibold',
            sized.title,
            // After the size: when merging classes, a later text size drops an earlier line height.
            'leading-[1.35]',
            'max-md:col-2 max-md:row-1 max-md:text-ink2 max-md:text-[13px] max-md:font-medium max-md:leading-[1.3]',
          )}
        >
          {shortTitle ? (
            <>
              <span className="max-md:hidden">{title}</span>
              <span className="hidden max-md:inline">{shortTitle}</span>
            </>
          ) : (
            title
          )}
        </span>
      )}
      {description && (
        <span className="text-ink2 text-[13px] leading-[1.4] max-md:hidden">{description}</span>
      )}
    </button>
  );
}
