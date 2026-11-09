'use client';

import {
  type CertificationListQuery,
  type CertificationSummary,
  filterCatalog,
  SPECIALTY_CODES,
} from '@tekcert/types';
import { cn, Sheet, SheetContent, SheetTitle } from '@tekcert/ui';
import { useState } from 'react';
import { DifficultyPicker, LevelToggles, toggle, toggleClass } from './controls';
import { specialtyColor } from './parts';

const GROUP = 'flex flex-col gap-0.5 [&>div]:gap-2';
const LEGEND = 'pb-2.5 text-ink3 type-overline';

/**
 * Mobile filters in a bottom sheet. Edits a draft and shows its live result count; nothing
 * changes in the list until "Show N certifications". Esc or a tap outside closes it.
 */
export function FilterSheet({
  certifications,
  query,
  onClose,
  onApply,
}: {
  certifications: CertificationSummary[];
  query: CertificationListQuery;
  onClose: () => void;
  onApply: (query: CertificationListQuery) => void;
}) {
  const [draft, setDraft] = useState(query);

  const count = filterCatalog(certifications, draft).length;
  const reset = () => setDraft({ q: query.q, provider: query.provider, sort: query.sort });

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
          <fieldset className={GROUP}>
            <legend className={LEGEND}>Certification level</legend>
            <LevelToggles
              value={draft.level}
              onChange={(level) => setDraft({ ...draft, level })}
              large
            />
          </fieldset>
          <fieldset className={GROUP}>
            <legend className={LEGEND}>Specialty</legend>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTY_CODES.map((code) => {
                const on = !!draft.specialty?.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    className={toggleClass(on, true)}
                    onClick={() => setDraft({ ...draft, specialty: toggle(draft.specialty, code) })}
                  >
                    <span
                      className={cn(
                        'flex-none size-2.25 rounded-full',
                        on && 'shadow-[0_0_0_1.5px_var(--pri-ink)]',
                      )}
                      style={{ background: specialtyColor(code) }}
                    />
                    {code}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className={GROUP}>
            <legend className={LEGEND}>Maximum difficulty</legend>
            <DifficultyPicker
              value={draft.maxDifficulty ?? 5}
              onChange={(maxDifficulty) => setDraft({ ...draft, maxDifficulty })}
              large
            />
          </fieldset>
          <button
            type="button"
            className="h-13 rounded-[10px] bg-pri text-pri-ink text-[16px] font-semibold cursor-pointer"
            onClick={() => onApply(draft)}
          >
            Show {count} {count === 1 ? 'certification' : 'certifications'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
