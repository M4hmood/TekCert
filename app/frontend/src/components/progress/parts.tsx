import { BADGE_KEYS, BADGES, type BadgeState, type Level } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import type { ReactNode } from 'react';

/** Small pieces shared by the dashboard, the certification page and the profile. */

const numberFormat = new Intl.NumberFormat('en-US');

/** "1,480" */
export function formatPoints(points: number): string {
  return numberFormat.format(points);
}

/** "1,020 points to Master", or the top-level line at Emeritus. */
export function toNextLabel(level: Level, unit: 'points' | 'pts' = 'points'): ReactNode {
  if (!level.next || level.toNext === null) return 'Top level reached';
  return (
    <>
      {formatPoints(level.toNext)} {unit} to <strong>{level.next.name}</strong>
    </>
  );
}

export function earnedCount(badges: readonly BadgeState[]): number {
  return badges.filter((badge) => badge.earnedAt !== null).length;
}

/**
 * The syllabus ring. `size` and `stroke` in px, as in the designs (128/10 on the dashboard,
 * 72/7 on phones). The arc turns gold when the syllabus is complete.
 */
export function ProgressRing({
  pct,
  size,
  stroke,
  className,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2 - 2;
  const length = 2 * Math.PI * r;
  const offset = length * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <span className={cn('relative flex-none', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-sf2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn(
            'transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
            pct >= 100 ? 'stroke-gold-fill' : 'stroke-pri',
          )}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">{children}</span>
    </span>
  );
}

/** The tick box drawn inside a chapter row (the row itself is the checkbox). */
export function TickBox({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center size-5.5 border-[1.5px] border-ln2 rounded-[6px] text-pri-ink transition-colors',
        done && 'border-pri bg-pri',
      )}
    >
      {done && <Icon name="check" size={17} />}
    </span>
  );
}

/** The gold seal with the level's roman numeral. `ring` adds the halo used on the hero card. */
export function LevelSeal({
  level,
  size = 'md',
  muted = false,
}: {
  level: Level;
  size?: 'sm' | 'md' | 'lg';
  /** Novice with no points: an outlined seal instead of the gold one. */
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center rounded-full font-serif font-semibold',
        muted
          ? 'border-[1.5px] border-ln2 text-ink2'
          : 'bg-gold-fill text-[#1A1406] shadow-[0_0_0_3px_var(--hero),0_0_0_4.5px_var(--gold-fill)]',
        size === 'lg' && 'size-13 text-[20px]',
        size === 'md' && 'size-11 text-[17px]',
        size === 'sm' && 'size-10 text-[16px]',
      )}
    >
      {level.roman}
    </span>
  );
}

/** The level bar on the dark hero card. */
export function LevelBar({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      className={cn('block h-1.5 rounded-[3px] bg-hero-ink/18', className)}
      role="progressbar"
      aria-label={level.next ? `Progress to ${level.next.name}` : 'Top level'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level.progress * 100)}
    >
      <span
        className="block h-full rounded-[3px] bg-gold-fill transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
        style={{ width: `${Math.round(level.progress * 100)}%` }}
      />
    </span>
  );
}

/** Earned badges as gold rings, then "N of 5 badges" (dashboard level card). */
export function BadgeStrip({ badges }: { badges: readonly BadgeState[] }) {
  const earned = badges.filter((badge) => badge.earnedAt !== null);
  return (
    <div className="flex items-center gap-2 pt-4 border-t border-hero-ink/16">
      {earned.map((badge) => (
        <span
          key={badge.key}
          title={BADGES[badge.key].name}
          className="grid place-items-center size-9.5 border-[1.5px] border-gold-fill rounded-full text-[#E2BC66]"
        >
          <Icon name={BADGES[badge.key].icon} size={19} label={BADGES[badge.key].name} />
        </span>
      ))}
      <span className="ms-1 text-[13px] opacity-75">
        {earned.length} of {BADGE_KEYS.length} badges
      </span>
    </div>
  );
}

/** All five badges with their names; locked ones are dashed (profile). */
export function BadgeGrid({ badges }: { badges: readonly BadgeState[] }) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {badges.map((badge) => {
        const def = BADGES[badge.key];
        const on = badge.earnedAt !== null;
        const description = on
          ? def.description
          : `${def.description} · ${def.available ? 'to unlock' : 'coming in a later release'}`;
        return (
          <li
            key={badge.key}
            title={description}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span
              className={cn(
                'grid place-items-center size-12 border-2 border-dashed border-ln2 rounded-full text-ink3',
                on && 'border-solid border-gold-fill bg-gold-sf text-gold',
              )}
            >
              <Icon name={def.icon} size={23} />
            </span>
            <span
              className={cn(
                'text-[11.5px] font-semibold leading-[1.25] text-ink3',
                on && 'text-ink',
              )}
            >
              {def.name}
              <span className="sr-only">{on ? ', earned' : `, locked: ${description}`}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
