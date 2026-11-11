import {
  BADGE_KEYS,
  levelFor,
  type ProfileHeld,
  type ProfilePath,
  type ProfilePreparing,
  type SpecialtyCode,
  type StudentProfile,
} from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { ProviderTag, specialtyColor } from '@/components/catalog/parts';
import { monthYear } from '@/components/certification/format';
import { activityLine, timeAgo } from '@/components/dashboard/format';
import {
  BadgeGrid,
  earnedCount,
  formatPoints,
  LevelBar,
  toNextLabel,
} from '@/components/progress/parts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { groupOf } from './format';
import { CopyEmail, HelpSwitch } from './profile-actions';

const CARD = 'flex flex-col border border-ln rounded-[16px] bg-sf';
const H2 = 'font-serif text-[28px] font-medium max-md:px-1 max-md:text-[22px] max-md:font-semibold';
const H3 = 'font-serif text-[21px] font-semibold';
const PILL =
  'inline-flex items-center gap-1.25 h-7 ps-1.75 pe-2.5 rounded-[14px] text-[13.5px] font-semibold';

export interface ProfileViewProps {
  profile: StudentProfile;
  /** ISO time of the server render, so "2 h ago" reads the same before and after hydration. */
  now: string;
}

/** A student's profile: mine (with my settings) or a classmate's (with a way to write to them). */
export function ProfileView({ profile, now }: ProfileViewProps) {
  const { isMe } = profile;
  const name = `${profile.firstName} ${profile.lastName}`;
  const group = `ING-${profile.year}${profile.specialty ? ` ${profile.specialty.code}` : ''} · group ${groupOf(profile.classCode)}`;
  const pointsLine =
    profile.points === null ? (
      profile.level.name
    ) : (
      <>
        {profile.level.name} · <strong className="text-ink">{formatPoints(profile.points)}</strong>{' '}
        pts
      </>
    );

  return (
    <>
      <section
        aria-label={isMe ? 'My profile' : `${name}'s profile`}
        className="flex flex-col gap-6 -mx-10 -mt-8 px-10 pt-7 pb-8 border-b border-ln bg-sf max-md:gap-3 max-md:-mx-4 max-md:-mt-5 max-md:px-4 max-md:pt-3 max-md:pb-2 max-md:border-none max-md:bg-transparent"
      >
        <div className="flex items-center justify-between gap-3">
          {isMe ? (
            <span className="flex flex-wrap items-center gap-2 text-ink2 text-[13.5px]">
              <span className={cn(PILL, 'bg-ok-sf text-ok')}>
                <Icon name="visibility" size={17} />
                Visible to students
              </span>
              {profile.privacy && (
                <span
                  className={cn(
                    PILL,
                    profile.privacy.leaderboardVisible ? 'bg-ok-sf text-ok' : 'bg-sf2 text-ink2',
                  )}
                >
                  <Icon name="leaderboard" size={17} />
                  {profile.privacy.leaderboardVisible
                    ? 'Visible on leaderboard'
                    : 'Anonymous on leaderboard'}
                </span>
              )}
              <Link href="/settings" className="ms-1 font-semibold max-md:hidden">
                Edit
              </Link>
            </span>
          ) : (
            <Link
              href="/community"
              aria-label="Back to community"
              className="flex items-center gap-1.5 min-h-11 text-[14px] font-semibold no-underline max-md:-ms-1.5 max-md:text-ink"
            >
              <Icon name="arrow_back" size={20} />
              <span className="max-md:hidden">Community</span>
            </Link>
          )}
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-8 max-lg:gap-5 max-md:flex max-md:flex-col max-md:gap-2.5 max-md:text-center">
          <div className="relative size-33 max-md:size-24">
            <Avatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              avatarPath={profile.avatarPath}
              className="absolute inset-0 size-full font-medium text-[48px] shadow-[0_0_0_4px_var(--sf),0_0_0_6px_var(--gold-fill)] max-md:text-[36px] max-md:shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--gold-fill)]"
            />
            <span
              title={`Level ${profile.level.roman} · ${profile.level.name}`}
              className="absolute -end-1 -bottom-1 grid place-items-center size-11 rounded-full bg-gold-fill text-[#1A1406] font-serif text-[17px] font-semibold shadow-[0_0_0_3px_var(--sf)] max-md:size-9 max-md:text-[14px] max-md:shadow-[0_0_0_3px_var(--bg)]"
            >
              <span aria-hidden>{profile.level.roman}</span>
              <span className="sr-only">
                Level {profile.level.roman}, {profile.level.name}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-2.5 min-w-0 max-md:items-center max-md:gap-2">
            <h1 className="font-serif text-[48px] font-medium tracking-[-0.02em] leading-[1.05] max-lg:text-[38px] max-md:mt-1.5 max-md:text-[30px]">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2 text-ink2 text-[15px] max-md:flex-col max-md:text-[14px]">
              <span className="flex items-center gap-1.5">
                <Icon name="school" size={19} className="text-ink3 max-md:hidden" />
                {group}
              </span>
              <SpecialtyPill profile={profile} />
            </div>
            <span className="hidden text-ink2 text-[14px] max-md:block">{pointsLine}</span>
            <span className="mt-1 max-md:hidden">
              <CopyEmail email={profile.email} />
            </span>
          </div>
          <div className="flex flex-col items-stretch gap-2.5 w-60 max-lg:w-52 max-md:w-full max-md:mt-2">
            {isMe ? (
              <>
                <span className="hidden font-mono text-[13.5px] text-ink2 truncate max-md:block">
                  {profile.email}
                </span>
                <Link
                  href="/settings"
                  className="flex items-center justify-center gap-2 h-11.5 border-[1.5px] border-ln2 rounded-[10px] text-ink text-[15px] font-semibold no-underline hover:bg-sf2 max-md:h-12"
                >
                  <Icon name="edit" size={19} />
                  Edit profile
                </Link>
              </>
            ) : (
              <>
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center justify-center gap-2 h-11.5 px-3 rounded-[10px] bg-pri text-pri-ink text-[15px] font-semibold no-underline max-md:h-12"
                >
                  <Icon name="mail" size={19} className="flex-none" />
                  <span className="max-md:hidden">Write to {profile.firstName}</span>
                  <span className="hidden truncate max-md:inline">{profile.email}</span>
                </a>
                <span className="text-ink3 text-[12.5px] text-center leading-[1.4] max-md:hidden">
                  Opens your institute mail
                </span>
              </>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-4 border border-ln rounded-[14px] bg-bg max-md:hidden">
          <Stat icon="pending" label="Unverified" value={profile.stats.unverified} first />
          <Stat
            icon="clock_loader_40"
            label="Preparing"
            value={profile.stats.preparing}
            tone="text-pri"
          />
          <Stat icon="check_box" label="Chapters done" value={profile.stats.chaptersDone} />
          <Stat icon="military_tech" label="Badges" value={profile.stats.badges} tone="text-gold" />
        </dl>
      </section>

      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] items-start gap-8 max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-3">
        <div className="flex flex-col gap-8 min-w-0 max-md:gap-3">
          <section aria-labelledby="collection-title" className="flex flex-col gap-4 max-md:gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="collection-title" className={H2}>
                <span className="max-md:hidden">Certification collection</span>
                <span className="hidden max-md:inline">
                  Collection · {profile.collection.length}
                </span>
              </h2>
              <span className="text-ink3 text-[13.5px] max-md:hidden">
                Unverified certifications earn no points yet
              </span>
            </div>
            {profile.collection.length === 0 ? (
              <Empty>
                {isMe
                  ? 'No certifications declared yet.'
                  : `${profile.firstName} hasn’t declared a certification yet.`}
              </Empty>
            ) : (
              <ul className="grid grid-cols-2 gap-4 max-xl:grid-cols-[minmax(0,1fr)] max-md:gap-3">
                {profile.collection.map((cert) => (
                  <HeldCard key={cert.slug} cert={cert} />
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="preparing-title"
            className="flex flex-col gap-3.5 max-md:gap-3 max-md:pt-3"
          >
            <h2 id="preparing-title" className={H2}>
              Preparing
            </h2>
            {profile.preparing.length === 0 ? (
              <Empty>
                {isMe ? (
                  <>
                    Nothing in progress. <Link href="/catalog">Pick a certification</Link> to start.
                  </>
                ) : (
                  'Nothing in progress right now.'
                )}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3.5 max-md:gap-3">
                {profile.preparing.map((cert) => (
                  <PreparingRow key={cert.slug} cert={cert} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5 min-w-0 max-md:gap-3 max-md:pt-3">
          <LevelCard profile={profile} />
          {isMe && <HelpSwitch initial={profile.availableToHelp} />}
          {profile.path && <PathCard path={profile.path} isMe={isMe} />}
          <section aria-labelledby="badges-title" className={cn(CARD, 'gap-4 p-5.5 max-md:p-4')}>
            <div className="flex items-baseline justify-between">
              <h3 id="badges-title" className={H3}>
                Badges
              </h3>
              <span className="text-ink3 text-[13px]">
                {earnedCount(profile.badges)} of {BADGE_KEYS.length}
              </span>
            </div>
            <BadgeGrid badges={profile.badges} />
          </section>
          <section
            aria-labelledby="activity-title"
            className={cn(CARD, 'gap-2.5 p-5.5 max-md:p-4')}
          >
            <h3 id="activity-title" className={H3}>
              Recent activity
            </h3>
            {profile.activity.length === 0 ? (
              <p className="py-2 border-t border-ln text-ink2 text-[14px]">No activity yet.</p>
            ) : (
              <ul>
                {profile.activity.map((item) => {
                  const line = activityLine(item);
                  return (
                    <li
                      key={item.id}
                      className="flex gap-2.5 py-2 border-t border-ln text-[14px] leading-[1.4]"
                    >
                      <Icon name={line.icon} size={18} className="flex-none text-ink3" />
                      <span className="flex-1 first-letter:uppercase">{line.what}</span>
                      <span className="flex-none text-ink3 text-[12.5px]">
                        {timeAgo(item.at, new Date(now))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function SpecialtyPill({ profile }: { profile: StudentProfile }) {
  const specialty = profile.specialty ?? profile.targetSpecialty;
  if (!specialty) return null;
  const target = !profile.specialty;
  const color = specialtyColor(specialty.code as SpecialtyCode);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.75 h-7 ps-2.25 pe-2.75 border-[1.5px] rounded-[14px] text-ink text-[13px] font-semibold',
        target
          ? 'border-dashed border-(--spec)'
          : 'border-transparent bg-[color-mix(in_oklch,var(--spec)_16%,var(--sf))]',
      )}
      style={{ '--spec': color } as CSSProperties}
    >
      <span className="flex-none size-2.25 rounded-full bg-(--spec)" />
      {target ? `Target specialty: ${specialty.code}` : `${specialty.code} · ${specialty.name}`}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = 'text-ink3',
  first = false,
}: {
  icon: string;
  label: string;
  /** Null when the student keeps it private. */
  value: number | null;
  tone?: string;
  first?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 py-4 px-5', !first && 'border-s border-ln')}>
      <dt className="flex items-center gap-1.5 text-ink2 text-[13px]">
        <Icon name={icon} size={17} className={tone} />
        {label}
      </dt>
      <dd className="font-serif text-[30px] font-medium">
        {value === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">Hidden</span>
          </>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 px-5 border-[1.5px] border-dashed border-ln2 rounded-[14px] text-ink2 text-[14.5px] max-md:py-4 max-md:px-3.5 max-md:rounded-[12px]">
      {children}
    </p>
  );
}

/** Release 1: every certification is unverified, so every card is the dashed one. */
function HeldCard({ cert }: { cert: ProfileHeld }) {
  return (
    <li className="flex items-center gap-4 p-6.5 border-[1.5px] border-dashed border-ln2 rounded-[14px] bg-bg max-md:gap-3 max-md:py-3 max-md:px-3.5 max-md:rounded-[12px]">
      <span className="grid flex-none place-items-center size-16 border-2 border-dashed border-ln2 rounded-full text-ink3 max-md:size-11">
        <Icon name="workspace_premium" size={26} />
      </span>
      <span className="flex flex-1 flex-col gap-1.25 min-w-0 max-md:gap-0.5">
        <span className="flex flex-wrap items-center gap-2 max-md:order-2">
          <span className="text-ink3 type-code">{cert.code}</span>
          <span className="inline-flex items-center gap-1 h-6 ps-1.5 pe-2.25 border-[1.5px] border-dashed border-ln2 rounded-[12px] text-ink2 text-[12px] font-semibold max-md:hidden">
            <Icon name="pending" size={15} />
            Unverified
          </span>
        </span>
        <Link
          href={`/catalog/${cert.slug}`}
          className="font-serif text-[19px] font-semibold leading-[1.2] text-ink2 no-underline hover:underline max-md:font-sans max-md:text-[14.5px]"
        >
          {cert.name}
        </Link>
        <span className="text-ink3 text-[13px] max-md:hidden">
          Declared {monthYear(cert.since)} · proof to come
        </span>
      </span>
      <span className="hidden flex-none items-center gap-0.75 text-ink2 text-[12px] font-semibold max-md:inline-flex">
        <Icon name="pending" size={16} />
        Unverified
      </span>
    </li>
  );
}

function PreparingRow({ cert }: { cert: ProfilePreparing }) {
  const chapters = cert.done !== null && cert.total !== null;
  return (
    <li>
      <Link
        href={`/catalog/${cert.slug}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_220px] items-center gap-4.5 py-4.5 px-5 border border-ln rounded-[14px] bg-sf text-ink no-underline hover:border-ln2 max-xl:grid-cols-[auto_minmax(0,1fr)_140px] max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-2 max-md:p-3.5 max-md:rounded-[12px]"
      >
        <span className="max-md:hidden">
          <ProviderTag provider={cert.provider} short />
        </span>
        <span className="flex flex-col gap-0.5 min-w-0 max-md:flex-row max-md:justify-between max-md:gap-2">
          <span className="text-[15.5px] font-semibold max-md:text-[14.5px]">{cert.name}</span>
          <span className="text-ink3 text-[13px] max-md:hidden">
            {cert.code}
            {chapters && ` · ${cert.done}/${cert.total} chapters`}
          </span>
          <span className="hidden font-serif text-[17px] font-semibold max-md:inline" aria-hidden>
            {cert.pct}%
          </span>
        </span>
        <span className="flex items-center gap-2.5">
          <span className="flex-1 h-1.5 rounded-[3px] bg-sf2 max-md:h-1.25" aria-hidden>
            <span className="block h-full rounded-[3px] bg-pri" style={{ width: `${cert.pct}%` }} />
          </span>
          <span className="w-12 text-end font-serif text-[18px] font-semibold max-md:sr-only">
            {cert.pct}%<span className="sr-only"> of the syllabus done</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function LevelCard({ profile }: { profile: StudentProfile }) {
  const level = profile.points === null ? null : levelFor(profile.points);
  return (
    <section
      aria-label={profile.isMe ? 'My level' : 'Level'}
      className="flex flex-col gap-3.5 p-6 rounded-[16px] bg-hero text-hero-ink max-md:hidden"
    >
      <span className="type-overline opacity-70">Level {profile.level.roman}</span>
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-[34px] font-medium">{profile.level.name}</span>
        {profile.points !== null && (
          <span className="text-[14px]">
            <strong className="font-serif text-[24px] font-medium">
              {formatPoints(profile.points)}
            </strong>{' '}
            pts
          </span>
        )}
      </div>
      {level ? (
        <>
          <LevelBar level={level} />
          <span className="text-[13px] opacity-80">{toNextLabel(level)}</span>
        </>
      ) : (
        <span className="text-[13px] opacity-80">
          {profile.firstName} keeps their points private.
        </span>
      )}
    </section>
  );
}

const PATH_TAG: Record<ProfilePath['kind'], { mine: string; theirs: string }> = {
  specialty: { mine: 'My specialty', theirs: 'Their specialty' },
  target: { mine: 'Target specialty', theirs: 'Target specialty' },
  fundamentals: { mine: 'Fundamentals', theirs: 'Fundamentals' },
};

function PathCard({ path, isMe }: { path: ProfilePath; isMe: boolean }) {
  const shared = path.kind === 'fundamentals';
  const pct = path.total ? Math.round((path.heldCount / path.total) * 100) : 0;
  return (
    <section aria-labelledby="path-title" className={cn(CARD, 'gap-1 p-5.5 max-md:p-4')}>
      <h3 id="path-title" className={cn(H3, 'mb-2')}>
        Path
      </h3>
      <Link
        href="/paths"
        className="flex flex-col gap-2 py-3 border-t border-ln text-ink no-underline"
      >
        <span className="flex items-center gap-2.5">
          <span
            className="flex-none size-2.75 rounded-full bg-ink3"
            style={shared ? undefined : { background: specialtyColor(path.code as SpecialtyCode) }}
          />
          <span className="flex-1 text-[15px] font-semibold">
            {shared ? path.name : `${path.code} · ${path.name}`}
          </span>
          {!shared && (
            <span className="flex-none text-ink3 text-[12px] font-semibold">
              {PATH_TAG[path.kind][isMe ? 'mine' : 'theirs']}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="flex-1 h-1.25 rounded-[3px] bg-sf2" aria-hidden>
            <span
              className="block h-full rounded-[3px] bg-gold-fill"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="text-ink2 text-[12.5px] font-semibold">
            {path.heldCount}/{path.total}
            <span className="sr-only"> certifications of the path earned</span>
          </span>
        </span>
      </Link>
    </section>
  );
}
