import {
  type BadgeState,
  type Dashboard,
  type DashboardNext,
  type DashboardPath,
  type Level,
  type SpecialtyCode,
} from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { ProviderTag, shortProviderName, specialtyColor } from '@/components/catalog/parts';
import {
  BadgeStrip,
  formatPoints,
  LevelBar,
  LevelSeal,
  toNextLabel,
} from '@/components/progress/parts';
import { NODE_LOOK } from './format';

/** Presentational dashboard cards (design/Tableau-de-bord). */

export const CARD = 'flex flex-col border border-ln rounded-[16px] bg-sf';
export const OVERLINE = 'text-ink3 type-overline';

/** Desktop: the dark hero card with the badges. */
export function LevelCard({
  points,
  level,
  badges,
}: {
  points: number;
  level: Level;
  badges: readonly BadgeState[];
}) {
  return (
    <section
      aria-label="My level"
      className="flex flex-col gap-4.5 p-6.5 rounded-[16px] bg-hero text-hero-ink max-md:hidden"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="type-overline opacity-70">My level</span>
          <span className="font-serif text-[32px] font-medium leading-[1.15]">{level.name}</span>
        </div>
        <LevelSeal level={level} size="lg" />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-serif text-[48px] font-medium leading-none tracking-[-0.02em]"
          data-testid="points"
        >
          {formatPoints(points)}
        </span>
        <span className="text-[14px] opacity-75">points</span>
      </div>
      <div className="flex flex-col gap-2">
        <LevelBar level={level} />
        <span className="text-[13px] opacity-80">{toNextLabel(level)}</span>
      </div>
      <BadgeStrip badges={badges} />
    </section>
  );
}

/** Phones: the compact hero strip at the top. */
export function LevelStrip({ points, level }: { points: number; level: Level }) {
  return (
    <section
      aria-label="My level"
      className="hidden items-center gap-3.5 py-4 px-4.5 rounded-[14px] bg-hero text-hero-ink max-md:flex"
    >
      <LevelSeal level={level} size="md" />
      <div className="flex flex-1 flex-col gap-1.75">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[20px] font-medium">{level.name}</span>
          <span className="text-[14px]">
            <strong className="font-serif text-[19px]">{formatPoints(points)}</strong> pts
          </span>
        </div>
        <LevelBar level={level} className="h-1.25" />
        <span className="text-[12px] opacity-80">{toNextLabel(level, 'pts')}</span>
      </div>
    </section>
  );
}

/** Empty dashboard: Novice with nothing yet. */
export function NoviceCard({ level }: { level: Level }) {
  return (
    <section
      aria-label="My level"
      className="flex items-center gap-3.5 py-3.5 px-4 border border-ln rounded-[14px] bg-sf"
    >
      <LevelSeal level={level} size="sm" muted />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="font-serif text-[18px] font-semibold">{level.name}</span>
          <span className="text-ink2 text-[13.5px]">0 pts</span>
        </div>
        <span className="block h-1.25 rounded-[3px] bg-sf2" />
        <span className="text-ink3 text-[12px]">Finish a chapter to earn your first 10 points</span>
      </div>
    </section>
  );
}

function nextReason(next: DashboardNext, path: DashboardPath | null, group: string | null) {
  const why = next.after
    ? `Extend your ${shortProviderName(next.provider)} branch after ${next.after}.`
    : `Next on your ${path?.kind === 'fundamentals' ? 'Fundamentals' : (path?.code ?? '')} path.`;
  if (!group || next.earnedInGroup === 0) return why;
  const students = next.earnedInGroup === 1 ? 'student' : 'students';
  return `${why} ${next.earnedInGroup} ${group} ${students} earned it.`;
}

export function NextCard({
  next,
  path,
  group,
}: {
  next: DashboardNext | null;
  path: DashboardPath | null;
  group: string | null;
}) {
  if (!next) {
    return (
      <section className={cn(CARD, 'gap-3.5 p-6 max-md:p-4.5')}>
        <span className={OVERLINE}>Next recommended certification</span>
        <span className="font-serif text-[23px] font-semibold leading-[1.2] max-md:text-[19px]">
          You&apos;ve covered your path
        </span>
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 min-h-9 text-[14.5px] font-semibold"
        >
          Browse the catalog
          <Icon name="arrow_forward" size={19} />
        </Link>
      </section>
    );
  }
  return (
    <>
      <section
        aria-label="Next recommended certification"
        className={cn(CARD, 'gap-3.5 p-6 max-md:hidden')}
      >
        <span className={OVERLINE}>Next recommended certification</span>
        <div className="flex items-center gap-2.5">
          <ProviderTag provider={next.provider} />
          <span className="text-ink3 type-code">{next.code}</span>
        </div>
        <span className="font-serif text-[23px] font-semibold leading-[1.2]">{next.name}</span>
        <span className="text-ink2 text-[14px] leading-normal">
          {nextReason(next, path, group)}
        </span>
        <Link
          href={`/catalog/${next.slug}`}
          className="flex items-center gap-1.5 min-h-9 text-[14.5px] font-semibold"
        >
          View page
          <Icon name="arrow_forward" size={19} />
        </Link>
      </section>
      <Link
        href={`/catalog/${next.slug}`}
        aria-label={`Next: ${next.code} · ${next.name}`}
        className={cn(CARD, 'hidden gap-2.5 p-4.5 text-ink no-underline max-md:flex')}
      >
        <span className="text-ink3 text-[11.5px] font-semibold tracking-[.1em] uppercase">
          Next
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-col gap-1 min-w-0">
            <span className="text-ink3 type-code text-[11.5px]">
              {next.provider.name} · {next.code}
            </span>
            <span className="font-serif text-[19px] font-semibold">{next.name}</span>
          </span>
          <span className="grid flex-none place-items-center size-11 border-[1.5px] border-ln2 rounded-full">
            <Icon name="arrow_forward" size={20} />
          </span>
        </span>
      </Link>
    </>
  );
}

const PATH_KIND = {
  specialty: "Your specialty's path",
  target: "The path of the specialty you're aiming for",
  fundamentals: 'The shared path before a specialty',
};

export function PathCard({ path }: { path: DashboardPath }) {
  const isFundamentals = path.kind === 'fundamentals';
  return (
    <section aria-label="My path" className={cn(CARD, 'gap-5 py-6 px-7 max-md:hidden')}>
      <div className="flex items-baseline gap-3.5 flex-wrap">
        <h2 className="flex items-center gap-2.5 font-serif text-[24px] font-medium">
          <span
            className="size-3 rounded-full"
            style={{
              background: isFundamentals
                ? 'var(--ink3)'
                : specialtyColor(path.code as SpecialtyCode),
            }}
          />
          My path · {isFundamentals ? 'Fundamentals' : path.code}
        </h2>
        <span className="text-ink2 text-[14px]">
          {PATH_KIND[path.kind]} · {path.heldCount} of {path.nodes.length} earned
        </span>
      </div>
      <ol className="flex items-center overflow-x-auto pb-1">
        {path.nodes.map((node, i) => {
          const look = NODE_LOOK[node.state];
          const last = i === path.nodes.length - 1;
          return (
            <li key={node.slug} className={cn('flex items-center min-w-0', !last && 'flex-1')}>
              <Link
                href={`/catalog/${node.slug}`}
                title={`${node.code} · ${look.label}`}
                className="flex flex-none flex-col items-center gap-2 w-21 text-ink2 no-underline"
              >
                <span
                  className={cn(
                    'grid place-items-center size-10 border-[1.5px] rounded-full',
                    look.className,
                  )}
                >
                  <Icon name={look.icon} size={20} />
                </span>
                <span className="font-mono text-[11px] font-medium whitespace-nowrap">
                  {node.code}
                  <span className="sr-only">, {look.label}</span>
                </span>
              </Link>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'flex-1 h-0.5 min-w-2 mb-5.5 bg-ln2',
                    node.state === 'held' && 'bg-pri',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function specialtyScopeLabel(specialty: SpecialtyCode | null, short: boolean): string {
  if (!specialty) return short ? 'No specialty yet, all years' : 'Students without a specialty yet';
  return short ? `${specialty} specialty, all years` : `In your ${specialty} specialty, all years`;
}

export function AlsoPreparing({
  code,
  data,
  specialty,
}: {
  code: string;
  data: Dashboard['alsoPreparing'];
  specialty: SpecialtyCode | null;
}) {
  return (
    <section className={cn(CARD, 'gap-1.5 p-6 max-md:p-4.5 max-md:gap-1')}>
      <h3 className="font-serif text-[20px] font-semibold max-md:text-[19px]">
        Also preparing {code}
      </h3>
      <span className="mb-2 text-ink3 text-[13.5px] max-md:mb-1.5 max-md:text-[13px]">
        <span className="max-md:hidden">{specialtyScopeLabel(specialty, false)}</span>
        <span className="hidden max-md:inline">{specialtyScopeLabel(specialty, true)}</span>
      </span>
      {data.items.length === 0 ? (
        <p className="py-3 border-t border-ln text-ink2 text-[14px]">
          Nobody else is preparing it yet.
        </p>
      ) : (
        <ul>
          {data.items.map((person) => (
            <li key={person.id} className="flex items-center gap-3 min-h-13 border-t border-ln">
              <Avatar
                firstName={person.firstName}
                lastName={person.lastName}
                avatarPath={person.avatarPath}
                className="size-9 text-[12.5px]"
              />
              <span className="flex flex-1 flex-col gap-px min-w-0">
                <span className="text-[14.5px] font-semibold truncate">
                  {person.firstName} {person.lastName}
                </span>
                <span className="text-ink3 text-[12.5px]">{person.group}</span>
              </span>
              <span className="w-16 h-1.25 rounded-[3px] bg-sf2 max-md:hidden" aria-hidden>
                <span
                  className="block h-full rounded-[3px] bg-pri"
                  style={{ width: `${person.pct}%` }}
                />
              </span>
              <span className="w-9 text-end text-[13px] font-semibold">{person.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GroupStarted({
  data,
  group,
}: {
  data: Dashboard['groupStarted'];
  group: string | null;
}) {
  const rest = data.total - data.items.length;
  const label = group ?? 'your year';
  return (
    <section className={cn(CARD, 'gap-3 p-4.5')}>
      <span className="text-[14.5px] font-semibold">Your class has already started</span>
      {data.total === 0 ? (
        <span className="text-ink2 text-[13.5px] leading-[1.4]">
          Nobody in {label} has started yet. Be the first.
        </span>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex">
            {data.items.map((person, i) => (
              <Avatar
                key={person.id}
                firstName={person.firstName}
                lastName={person.lastName}
                avatarPath={person.avatarPath}
                className={cn(
                  'size-8.5 text-[12px] shadow-[0_0_0_2.5px_var(--sf)]',
                  i > 0 && '-ms-2',
                )}
              />
            ))}
            {rest > 0 && (
              <span className="grid place-items-center size-8.5 -ms-2 rounded-full bg-sf2 text-ink2 text-[11.5px] font-semibold shadow-[0_0_0_2.5px_var(--sf)]">
                +{rest}
              </span>
            )}
          </div>
          <span className="text-ink2 text-[13.5px] leading-[1.4]">
            {data.total} {label} {data.total === 1 ? 'student is' : 'students are'} already
            preparing or hold a certification
          </span>
        </div>
      )}
    </section>
  );
}
