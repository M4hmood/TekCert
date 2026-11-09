'use client';

import { CERTIFICATION_LEVELS, type CertificationLevel } from '@tekcert/types';
import { cn } from '@tekcert/ui';
import { LEVEL_LABELS } from './parts';

/** Filter controls shared by the desktop panel and the mobile sheet. */

export const toggleClass = (on: boolean, large: boolean) =>
  cn(
    'inline-flex items-center gap-1.75 h-9 px-3 border-[1.5px] border-ln2 rounded-[18px] bg-sf text-[13.5px] font-semibold cursor-pointer',
    large && 'h-10 px-3.5 rounded-[20px] bg-transparent text-[14px]',
    on && 'border-pri bg-pri text-pri-ink',
  );

export function LevelToggles({
  value,
  onChange,
  large = false,
}: {
  value: CertificationLevel[] | undefined;
  onChange: (level: CertificationLevel[]) => void;
  large?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CERTIFICATION_LEVELS.map((level) => {
        const on = !!value?.includes(level);
        return (
          <button
            key={level}
            type="button"
            aria-pressed={on}
            className={toggleClass(on, large)}
            onClick={() => onChange(toggle(value, level) ?? [])}
          >
            {LEVEL_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}

export function DifficultyPicker({
  value,
  onChange,
  large = false,
}: {
  value: number;
  onChange: (value: number) => void;
  large?: boolean;
}) {
  return (
    <div className={cn('flex gap-1.5', large && 'grid grid-cols-5 gap-2')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Difficulty up to ${n}`}
          aria-pressed={n === value}
          className={cn(
            'w-10 h-10 border-[1.5px] border-ln2 rounded-[8px] bg-sf text-ink2 text-[14px] font-semibold cursor-pointer',
            large && 'w-auto h-11 bg-transparent text-ink',
            n < value && 'border-pri-sf bg-pri-sf text-pri',
            n === value && 'border-pri bg-pri text-pri-ink',
          )}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];
  return next.length ? next : undefined;
}
