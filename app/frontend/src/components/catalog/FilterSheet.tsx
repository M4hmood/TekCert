'use client';

import {
  type CertificationListQuery,
  type CertificationSummary,
  filterCatalog,
  SPECIALTY_CODES,
} from '@tekcert/types';
import { cx } from '@tekcert/ui';
import { useEffect, useRef, useState } from 'react';
import styles from './catalog.module.css';
import { DifficultyPicker, LevelToggles, toggle } from './controls';
import { specialtyColor } from './parts';

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
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  const count = filterCatalog(certifications, draft).length;
  const reset = () => setDraft({ q: query.q, provider: query.provider, sort: query.sort });

  return (
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-labelledby="filters-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.sheetBody}>
        <span className={styles.grabber} aria-hidden />
        <div className={styles.sheetHead}>
          <h2 id="filters-title" className={styles.sheetTitle}>
            Filters
          </h2>
          <button type="button" className={styles.sheetReset} onClick={reset}>
            Reset
          </button>
        </div>
        <fieldset className={styles.sheetGroup}>
          <legend className={styles.legend}>Certification level</legend>
          <LevelToggles
            value={draft.level}
            onChange={(level) => setDraft({ ...draft, level })}
            large
          />
        </fieldset>
        <fieldset className={styles.sheetGroup}>
          <legend className={styles.legend}>Specialty</legend>
          <div className={styles.toggles}>
            {SPECIALTY_CODES.map((code) => {
              const on = !!draft.specialty?.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={on}
                  className={cx(styles.toggle, styles.toggleLarge, on && styles.toggleOn)}
                  onClick={() => setDraft({ ...draft, specialty: toggle(draft.specialty, code) })}
                >
                  <span className={styles.round} style={{ background: specialtyColor(code) }} />
                  {code}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className={styles.sheetGroup}>
          <legend className={styles.legend}>Maximum difficulty</legend>
          <DifficultyPicker
            value={draft.maxDifficulty ?? 5}
            onChange={(maxDifficulty) => setDraft({ ...draft, maxDifficulty })}
            large
          />
        </fieldset>
        <button type="button" className={styles.sheetApply} onClick={() => onApply(draft)}>
          Show {count} {count === 1 ? 'certification' : 'certifications'}
        </button>
      </div>
    </dialog>
  );
}
