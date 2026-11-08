'use client';

import { CERTIFICATION_LEVELS, type CertificationLevel } from '@tekcert/types';
import { cx } from '@tekcert/ui';
import styles from './catalog.module.css';
import { LEVEL_LABELS } from './parts';

/** Filter controls shared by the desktop panel and the mobile sheet. */

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
    <div className={styles.toggles}>
      {CERTIFICATION_LEVELS.map((level) => {
        const on = !!value?.includes(level);
        return (
          <button
            key={level}
            type="button"
            aria-pressed={on}
            className={cx(styles.toggle, large && styles.toggleLarge, on && styles.toggleOn)}
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
    <div className={cx(styles.difficulty, large && styles.difficultyLarge)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Difficulty up to ${n}`}
          aria-pressed={n === value}
          className={cx(styles.step, n < value && styles.stepInRange, n === value && styles.stepOn)}
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
