'use client';

import {
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
  type LeaderboardRow,
  type LeaderboardScope,
  ordinalSuffix,
  periodLabel,
  POINTS_PER_CHAPTER,
  type SpecialtyLeaderboard,
  SpecialtyLeaderboardSchema,
  type StudentLeaderboard,
  StudentLeaderboardSchema,
} from '@tekcert/types';
import { cn, Icon, Select } from '@tekcert/ui';
import Link from 'next/link';
import { Fragment, type ReactNode, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { specialtyColor } from '@/components/catalog/parts';
import { classLabel } from '@/components/community/format';
import { PageHeader } from '@/components/PageHeader';
import { formatPoints } from '@/components/progress/parts';
import { getJson, withSessionRefresh } from '@/lib/client-api';
import {
  BOARD_VIEWS,
  type BoardFilters,
  boardPath,
  type BoardScopeLabel,
  boardScopeLabels,
  boardSearch,
  type BoardView,
  changeLine,
  changeLook,
  gapSentence,
} from './format';

export interface LeaderboardViewProps {
  /** Parsed from the URL on the server, so a shared link opens on the same board. */
  initialFilters: BoardFilters;
  /** The board of the first render; null when it could not be loaded. */
  initialStudents: StudentLeaderboard | null;
  initialSpecialties: SpecialtyLeaderboard | null;
  /** ISO time of the server render: the period names read the same before and after hydration. */
  now: string;
}

const VIEW_LABELS: Record<BoardView, string> = { students: 'Students', specialties: 'Specialties' };
const NO_VIEWER: StudentLeaderboard['viewer'] = { classCode: null, year: null, specialty: null };
const SEGMENT =
  'h-9.5 px-3.5 border-none rounded-[7px] bg-transparent text-ink2 text-[13.5px] font-semibold whitespace-nowrap cursor-pointer';
const SEGMENT_ON = 'bg-sf text-ink shadow-[0_1px_2px_rgba(19,26,44,.12)]';
const ROW_GRID =
  'grid grid-cols-[64px_minmax(0,1fr)_120px_110px_110px] gap-3 max-lg:grid-cols-[52px_minmax(0,1fr)_90px_80px_90px] max-md:grid-cols-[34px_36px_minmax(0,1fr)_auto] max-md:gap-2.5';

/** Students and specialties ranked on the points ledger, by scope and period. */
export function LeaderboardView({
  initialFilters,
  initialStudents,
  initialSpecialties,
  now,
}: LeaderboardViewProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [students, setStudents] = useState(initialStudents);
  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(
    initialFilters.view === 'students' ? !initialStudents : !initialSpecialties,
  );
  const latest = useRef(0);
  const nowDate = new Date(now);

  const load = async (next: BoardFilters) => {
    setFilters(next);
    const query = boardSearch(next);
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    const request = ++latest.current;
    setLoading(true);
    const result =
      next.view === 'students'
        ? await withSessionRefresh(() => getJson(boardPath(next), StudentLeaderboardSchema))
        : await withSessionRefresh(() => getJson(boardPath(next), SpecialtyLeaderboardSchema));
    // A slower earlier answer must not replace a newer one.
    if (request !== latest.current) return;
    setLoading(false);
    setFailed(!result.ok);
    if (!result.ok) return;
    if ('rows' in result.data) setStudents(result.data);
    else setSpecialties(result.data);
  };

  const isStudents = filters.view === 'students';
  // A board loaded for other filters stays on screen, dimmed, until the new one arrives.
  const scopes = boardScopeLabels(students?.viewer ?? NO_VIEWER);
  const scope = scopes.find((s) => s.value === filters.scope) ?? scopes[0];
  const periodOptions = LEADERBOARD_PERIODS.map((period) => ({
    value: period,
    label: periodLabel(period, nowDate),
  }));
  const board = isStudents ? students : specialties;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Points come from finished chapters."
        actions={
          <Segmented
            label="View"
            className="max-md:hidden"
            options={BOARD_VIEWS.map((view) => ({ value: view, label: VIEW_LABELS[view] }))}
            value={filters.view}
            onChange={(view) => void load({ ...filters, view })}
          />
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6 max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-3.5">
        <div className="flex flex-col gap-3.5 min-w-0">
          <Segmented
            label="View"
            className="hidden max-md:grid max-md:grid-cols-2"
            options={BOARD_VIEWS.map((view) => ({ value: view, label: VIEW_LABELS[view] }))}
            value={filters.view}
            onChange={(view) => void load({ ...filters, view })}
          />
          <section
            aria-label={isStudents ? 'Student leaderboard' : 'Specialty leaderboard'}
            className="border border-ln rounded-[16px] bg-sf overflow-hidden max-md:border-none max-md:rounded-none max-md:bg-transparent max-md:overflow-visible"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 py-4 px-5 border-b border-ln max-md:flex-col max-md:items-stretch max-md:p-0 max-md:pb-3.5 max-md:border-none">
              {isStudents ? (
                <Segmented
                  label="Scope"
                  className="max-md:grid max-md:grid-cols-3"
                  options={scopes.map((s) => ({
                    value: s.value,
                    label: <ScopeText scope={s} />,
                  }))}
                  value={filters.scope}
                  onChange={(next: LeaderboardScope) => void load({ ...filters, scope: next })}
                />
              ) : (
                <span className="text-ink2 text-[14px] max-md:px-1 max-md:text-[13px]">
                  Average points per student · all years
                </span>
              )}
              <span className="max-md:self-end">
                <Select
                  label="Period"
                  value={filters.period}
                  options={periodOptions}
                  onChange={(period: LeaderboardPeriod) => void load({ ...filters, period })}
                />
              </span>
            </div>

            {failed && (
              <p role="alert" className="py-4 px-5 text-err text-[14px] max-md:px-1">
                The leaderboard could not be loaded.{' '}
                <button
                  type="button"
                  className="p-0 border-none bg-transparent text-pri font-semibold underline cursor-pointer"
                  onClick={() => void load(filters)}
                >
                  Try again
                </button>
              </p>
            )}

            <div
              aria-busy={loading}
              className={cn('transition-opacity duration-150', loading && 'opacity-55')}
            >
              {isStudents && students && <StudentTable board={students} />}
              {!isStudents && specialties && <SpecialtyList board={specialties} />}
            </div>
          </section>
          {board && (
            <p className="px-1 text-ink3 text-[13px]">
              {isStudents
                ? `Ranked on the points earned in ${periodPhrase(filters.period, board.periodLabel)}. “Change” is the places gained or lost over the last 7 days.`
                : `Students in ING-1 to 3 count for the specialty they aim for.`}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-4 max-md:hidden">
          {isStudents && students?.me && scope && (
            <PositionCard board={students} me={students.me} scope={scope} />
          )}
          <ScoringCard hidden={students?.me?.visible === false} />
        </aside>
      </div>

      {isStudents && students?.me && <PinnedRow board={students} me={students.me} />}
    </>
  );
}

function periodPhrase(period: LeaderboardPeriod, label: string): string {
  return period === 'all' ? 'all time' : label;
}

function ScopeText({ scope }: { scope: BoardScopeLabel }) {
  return (
    <>
      <span className="max-md:hidden">{scope.long}</span>
      <span className="hidden max-md:inline">{scope.short}</span>
    </>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex gap-0.5 p-1 rounded-[10px] bg-sf2', className)}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => !on && onChange(option.value)}
            className={cn(SEGMENT, 'max-md:px-1 max-md:text-[13px]', on && SEGMENT_ON)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StudentTable({ board }: { board: StudentLeaderboard }) {
  if (board.total === 0) {
    return (
      <EmptyBoard title="Nobody to rank here yet">
        This board fills up once students of this group finish onboarding.
      </EmptyBoard>
    );
  }
  if (board.rows.every((row) => row.points === 0)) {
    return (
      <EmptyBoard
        title={board.period === 'all' ? 'No points yet' : `No points yet in ${board.periodLabel}`}
      >
        Finish a chapter to be the first on this board.
      </EmptyBoard>
    );
  }
  return (
    <div
      role="table"
      aria-label="Student leaderboard"
      className="max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf max-md:overflow-hidden"
    >
      <div
        role="row"
        className={cn(
          ROW_GRID,
          'py-2.5 px-5 border-b border-ln text-ink3 type-overline max-md:hidden',
        )}
      >
        <span role="columnheader">Rank</span>
        <span role="columnheader">Student</span>
        <span role="columnheader">Chapters</span>
        <span role="columnheader">Change</span>
        <span role="columnheader" className="text-end">
          Points
        </span>
      </div>
      {board.rows.map((row, index) => {
        const previous = board.rows[index - 1];
        return (
          <Fragment key={row.position}>
            {previous && row.position > previous.position + 1 && (
              <div
                role="presentation"
                aria-hidden
                className="flex items-center justify-center h-8 border-b border-ln text-ink3 text-[18px] tracking-[.3em] max-md:h-7 max-md:text-[16px]"
              >
                ···
              </div>
            )}
            <StudentRow row={row} />
          </Fragment>
        );
      })}
    </div>
  );
}

function StudentRow({ row }: { row: LeaderboardRow }) {
  const change = changeLook(row.change);
  const person = row.person;
  const name = person ? `${person.firstName} ${person.lastName}` : 'Anonymous';
  const chapters = `${row.chapters} ${row.chapters === 1 ? 'chapter' : 'chapters'}`;
  return (
    <div
      role="row"
      aria-current={row.isMe ? 'true' : undefined}
      className={cn(
        ROW_GRID,
        'items-center min-h-15 px-5 border-b border-ln last:border-b-0 max-md:min-h-14 max-md:px-3.5',
        row.isMe && 'bg-pri-sf shadow-[inset_3px_0_0_var(--pri)]',
      )}
    >
      <span role="cell" className="flex items-center">
        {row.rank <= 3 ? (
          <span
            className={cn(
              'grid place-items-center size-8.5 rounded-full font-serif text-[17px] font-semibold max-md:size-7 max-md:text-[14px]',
              row.rank === 1 && 'bg-gold-fill text-[#1A1406]',
              row.rank === 2 && 'bg-sf2 text-ink',
              row.rank === 3 && 'bg-warn-sf text-warn',
            )}
          >
            {row.rank}
          </span>
        ) : (
          <span className="ps-2 font-mono text-[15px] font-medium text-ink2 max-md:ps-0 max-md:text-[14px] max-md:font-semibold">
            {row.rank}
          </span>
        )}
      </span>
      <span role="cell" className="flex items-center gap-3 min-w-0 max-md:contents">
        {person ? (
          <Avatar
            firstName={person.firstName}
            lastName={person.lastName}
            avatarPath={person.avatarPath}
            className={cn(
              'size-9.5 text-[15px] max-md:size-9 max-md:text-[14px]',
              row.isMe && 'bg-pri text-pri-ink',
            )}
          />
        ) : (
          <span
            aria-hidden
            className="grid flex-none place-items-center size-9.5 rounded-full bg-sf2 text-ink3 max-md:size-9"
          >
            <Icon name="person" size={20} />
          </span>
        )}
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[15px] font-semibold truncate max-md:text-[14.5px]">
            {row.isMe && 'You · '}
            {person && !row.isMe ? (
              <Link
                href={`/community/${person.id}`}
                className="text-ink no-underline hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className={cn(!person && 'text-ink2')}>{name}</span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-ink3 text-[12.5px] max-md:text-[12px]">
            {person ? (
              <>
                <span
                  className="flex-none size-2 rounded-full bg-ink3 max-md:hidden"
                  style={
                    person.specialty ? { background: specialtyColor(person.specialty) } : undefined
                  }
                />
                <span className="truncate max-md:hidden">{classLabel(person)}</span>
                <span className="hidden max-md:inline">
                  ING-{person.year} · {chapters}
                </span>
              </>
            ) : (
              <>
                <span className="max-md:hidden">Name hidden</span>
                <span className="hidden max-md:inline">{chapters}</span>
              </>
            )}
          </span>
        </span>
      </span>
      <span role="cell" className="text-[14.5px] max-md:hidden">
        {row.chapters}
      </span>
      <span
        role="cell"
        className={cn(
          'flex items-center gap-0.5 text-[13.5px] font-semibold max-md:hidden',
          change.className,
        )}
      >
        <Icon name={change.icon} size={18} label={change.label} />
        <span aria-hidden>{change.text}</span>
      </span>
      <span
        role="cell"
        className="font-serif text-[20px] font-semibold text-end max-md:text-[18px]"
      >
        {formatPoints(row.points)}
      </span>
    </div>
  );
}

function SpecialtyList({ board }: { board: SpecialtyLeaderboard }) {
  if (board.items.length === 0) {
    return (
      <EmptyBoard title="No specialty to rank yet">
        Specialties appear once their students finish onboarding.
      </EmptyBoard>
    );
  }
  const best = Math.max(1, ...board.items.map((item) => item.average));
  return (
    <ol className="flex flex-col pt-2 px-5 pb-5 max-md:p-0 max-md:px-3.5 max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf">
      {board.items.map((item) => {
        const color = specialtyColor(item.code);
        return (
          <li
            key={item.code}
            className="grid grid-cols-[40px_180px_minmax(0,1fr)_90px] items-center gap-4 min-h-18 border-b border-ln last:border-b-0 max-md:grid-cols-[28px_minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:py-3"
          >
            <span className="font-serif text-[24px] font-semibold text-ink2 max-md:text-[20px]">
              {item.rank}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="flex items-center gap-2 text-[15.5px] font-semibold">
                <span className="flex-none size-2.5 rounded-full" style={{ background: color }} />
                <span title={item.name}>{item.code}</span>
                {item.isMine && <span className="text-pri text-[12px] font-semibold">· yours</span>}
              </span>
              <span className="text-ink3 text-[12.5px]">
                {item.students} {item.students === 1 ? 'student' : 'students'}
              </span>
            </span>
            <span
              className="h-2.5 rounded-[5px] bg-sf2 max-md:order-last max-md:col-start-2 max-md:col-span-2 max-md:h-2"
              aria-hidden
            >
              <span
                className="block h-full rounded-[5px]"
                style={{
                  width: `${Math.max(0, Math.round((item.average / best) * 100))}%`,
                  background: color,
                }}
              />
            </span>
            <span className="font-serif text-[20px] font-semibold text-end">
              {formatPoints(item.average)}
              <span className="sr-only"> points per student</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyBoard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-14 px-6 text-center max-md:border-[1.5px] max-md:border-dashed max-md:border-ln2 max-md:rounded-[14px]">
      <Icon name="leaderboard" size={36} className="text-ink3" />
      <h2 className="font-serif text-[22px] font-semibold">{title}</h2>
      <p className="text-ink2 text-[14.5px]">{children}</p>
    </div>
  );
}

function PositionCard({
  board,
  me,
  scope,
}: {
  board: StudentLeaderboard;
  me: NonNullable<StudentLeaderboard['me']>;
  scope: BoardScopeLabel;
}) {
  const anyPoints = board.rows.some((row) => row.points > 0);
  return (
    <section
      aria-label="Your position"
      className="flex flex-col gap-3.5 p-5.5 rounded-[16px] bg-hero text-hero-ink"
    >
      <span className="type-overline opacity-80">Your position · {scope.position}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[52px] font-medium leading-none">
          {me.rank}
          <sup className="text-[22px]">{ordinalSuffix(me.rank)}</sup>
        </span>
        <span className="text-[15px] opacity-85">of {board.total}</span>
      </div>
      <p className="text-[14.5px] leading-[1.55] opacity-92">{gapSentence(me, anyPoints)}</p>
      {!me.visible && (
        <p className="flex items-center gap-1.5 text-[13px] opacity-80">
          <Icon name="visibility_off" size={17} />
          Others see you as Anonymous.
        </p>
      )}
      <Link
        href={me.continue ? `/catalog/${me.continue.slug}?tab=syllabus` : '/catalog'}
        className="flex items-center justify-center h-11 rounded-[10px] bg-hero-ink text-hero text-[14.5px] font-semibold no-underline"
      >
        {me.continue ? `Continue ${me.continue.code}` : 'Pick a certification'}
      </Link>
    </section>
  );
}

function ScoringCard({ hidden }: { hidden: boolean }) {
  return (
    <section
      aria-labelledby="scoring-title"
      className="flex flex-col gap-1 p-5 border border-ln rounded-[16px] bg-sf"
    >
      <h2 id="scoring-title" className="mb-2 font-serif text-[20px] font-semibold">
        Scoring
      </h2>
      <div className="flex items-center justify-between gap-3 min-h-9 border-b border-ln text-[14px]">
        <span className="text-ink2">Path chapter completed</span>
        <strong className="text-gold">+{POINTS_PER_CHAPTER}</strong>
      </div>
      <p className="pt-2.5 text-ink3 text-[13px] leading-[1.45]">
        Verified certifications and practice tests will earn points in a later release.
      </p>
      <Link
        href="/profile#privacy"
        className="flex items-center min-h-8 mt-2.5 text-[13.5px] font-semibold"
      >
        {hidden ? 'Show my name on the leaderboard' : 'Hide my name from the leaderboard'}
      </Link>
    </section>
  );
}

/** Phones: my row stays in sight above the tab bar. */
function PinnedRow({
  board,
  me,
}: {
  board: StudentLeaderboard;
  me: NonNullable<StudentLeaderboard['me']>;
}) {
  const mine = board.rows.find((row) => row.isMe)?.person;
  return (
    <>
      {/* Keeps the last rows of the list clear of the pinned row. */}
      <div className="hidden h-16 max-md:block" aria-hidden />
      <div
        role="group"
        aria-label="Your row"
        className="hidden fixed inset-x-0 bottom-(--bottom-nav-height) z-10 grid-cols-[34px_36px_minmax(0,1fr)_auto] items-center gap-2.5 min-h-16 px-7.5 border-t border-ln bg-pri-sf shadow-[0_-6px_16px_-8px_rgba(19,26,44,.2)] max-md:grid"
      >
        <span className="font-mono text-[14px] font-semibold">{me.rank}</span>
        {mine ? (
          <Avatar
            firstName={mine.firstName}
            lastName={mine.lastName}
            avatarPath={mine.avatarPath}
            className="size-9 bg-pri text-pri-ink text-[14px]"
          />
        ) : (
          <span />
        )}
        <span className="flex flex-col gap-0.25 min-w-0">
          <span className="text-[14.5px] font-semibold">
            You
            {!me.visible && <span className="text-ink3 font-medium"> · Anonymous to others</span>}
          </span>
          <span
            className={cn(
              'text-[12px] font-semibold',
              (me.change ?? 0) > 0 ? 'text-ok' : (me.change ?? 0) < 0 ? 'text-err' : 'text-ink3',
            )}
          >
            {[changeLine(me.change), `of ${board.total}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="font-serif text-[18px] font-semibold">{formatPoints(me.points)}</span>
      </div>
    </>
  );
}
