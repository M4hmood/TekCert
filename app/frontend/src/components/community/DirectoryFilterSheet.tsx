'use client';

import type { Directory } from '@tekcert/types';
import { cn, Select, type SelectOption, Sheet, SheetContent, SheetTitle } from '@tekcert/ui';
import { useState } from 'react';
import { specialtyColor } from '@/components/catalog/parts';
import { HelpToggle, specialtyChipLabel } from './controls';
import type { DirectoryFilters } from './format';

const LEGEND = 'pb-2.5 text-ink3 type-overline';

/**
 * The phone's filters in a bottom sheet. It edits a draft: the list only changes on "Apply".
 * Esc or a tap outside closes it without applying.
 */
export function DirectoryFilterSheet({
  filters,
  holdOptions,
  specialties,
  onClose,
  onApply,
}: {
  filters: DirectoryFilters;
  holdOptions: SelectOption<string>[];
  /** Empty when the scope has a single specialty. */
  specialties: Directory['specialties'];
  onClose: () => void;
  onApply: (filters: DirectoryFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const reset = () => setDraft({ scope: filters.scope, q: filters.q });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <div className="flex flex-col gap-5 pt-2.5 px-5 pb-6">
          <span className="self-center w-10 h-1 rounded-[2px] bg-ln2" aria-hidden />
          <div className="flex items-center justify-between">
            <SheetTitle className="font-serif text-[24px] font-semibold">Filters</SheetTitle>
            <button
              type="button"
              className="min-h-11 px-1.5 text-pri text-[14.5px] font-semibold cursor-pointer"
              onClick={reset}
            >
              Reset
            </button>
          </div>
          <fieldset className="flex flex-col">
            <legend className={LEGEND}>Certification held</legend>
            <Select
              label="Holds"
              value={draft.holds ?? ''}
              options={holdOptions}
              onChange={(holds) => setDraft({ ...draft, holds: holds || undefined })}
            />
          </fieldset>
          <fieldset className="flex flex-col">
            <legend className={LEGEND}>Help</legend>
            <HelpToggle
              on={!!draft.help}
              onToggle={() => setDraft({ ...draft, help: draft.help ? undefined : true })}
              className="self-start"
            />
          </fieldset>
          {specialties.length > 0 && (
            <fieldset className="flex flex-col">
              <legend className={LEGEND}>Specialty</legend>
              <div className="flex flex-wrap gap-1.5">
                {specialties.map(({ code, count }) => {
                  const on = draft.specialty === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, specialty: on ? undefined : code })}
                      className={cn(
                        'inline-flex items-center gap-1.75 h-10 px-3.5 border-[1.5px] border-ln2 rounded-[20px] text-[14px] font-semibold cursor-pointer',
                        on && 'border-pri bg-pri-sf',
                      )}
                    >
                      <span
                        className="flex-none size-2.25 rounded-full bg-ink3"
                        style={code === 'none' ? undefined : { background: specialtyColor(code) }}
                      />
                      {specialtyChipLabel(code)}
                      <span className="font-medium text-ink3">{count}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          <button
            type="button"
            className="h-13 rounded-[10px] bg-pri text-pri-ink text-[16px] font-semibold cursor-pointer"
            onClick={() => onApply(draft)}
          >
            Apply filters
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
