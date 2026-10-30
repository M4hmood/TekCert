import { cx, Icon } from '@tekcert/ui';
import type { CSSProperties, ReactNode } from 'react';
import styles from './onboarding.module.css';

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
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={style}
      className={cx(styles.choice, styles[size], colour && styles.tinted, dashed && styles.dashed)}
    >
      <span className={styles.choiceHead}>
        <span className={styles.choiceCode}>
          {(colour || dashed) && <span className={styles.dot} aria-hidden />}
          {code}
        </span>
        <Icon
          name={selected ? 'check_circle' : 'radio_button_unchecked'}
          filled={selected}
          className={styles.check}
        />
      </span>
      {title && (
        <span className={styles.choiceTitle}>
          {shortTitle ? (
            <>
              <span className={styles.wide}>{title}</span>
              <span className={styles.narrow}>{shortTitle}</span>
            </>
          ) : (
            title
          )}
        </span>
      )}
      {description && <span className={styles.choiceText}>{description}</span>}
    </button>
  );
}
