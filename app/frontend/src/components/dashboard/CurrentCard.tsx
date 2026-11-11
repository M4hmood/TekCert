'use client';

import { chapterWindowStart, type DashboardCurrent, percentDone } from '@tekcert/types';
import { buttonClass, cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { LevelBars, ProviderTag } from '@/components/catalog/parts';
import { dayMonth, studyTime } from '@/components/certification/format';
import { ProgressRing, TickBox } from '@/components/progress/parts';
import { CARD, OVERLINE } from './cards';

/** Rows shown: four on desktop, the first three of them on phones. */
const WINDOW = 4;

export interface CurrentCardProps {
  current: DashboardCurrent;
  done: ReadonlySet<string>;
  pending: ReadonlySet<string>;
  onToggle: (chapterId: string) => void;
}

/** The certification in progress: ring, the next few chapters (tickable) and the syllabus link. */
export function CurrentCard({ current, done, pending, onToggle }: CurrentCardProps) {
  const flags = current.chapters.map((chapter) => done.has(chapter.id));
  const doneCount = flags.filter(Boolean).length;
  const pct = percentDone(doneCount, current.chapters.length);
  const start = chapterWindowStart(flags, WINDOW);
  const shown = current.chapters.slice(start, start + WINDOW);
  const syllabusHref = `/catalog/${current.slug}?tab=syllabus`;

  return (
    <section
      aria-label="Current certification"
      className={cn(CARD, 'gap-6 p-7 max-md:gap-4 max-md:p-4.5')}
    >
      <div className="flex items-center justify-between max-md:hidden">
        <span className={OVERLINE}>Current certification</span>
        <span className="inline-flex items-center gap-1.25 h-6.5 ps-1.75 pe-2.5 rounded-[13px] bg-pri-sf text-pri text-[12.5px] font-semibold">
          <Icon name="clock_loader_40" size={16} />
          In progress
        </span>
      </div>
      <div className="flex items-center gap-7 max-md:gap-4">
        <ProgressRing pct={pct} size={128} stroke={10} className="max-md:hidden">
          <span className="font-serif text-[36px] font-medium leading-none">
            {pct}
            <span className="text-[20px]"> %</span>
          </span>
          <span className="mt-1 text-ink3 text-[12px]">
            {doneCount}/{current.chapters.length} chapters
          </span>
        </ProgressRing>
        <ProgressRing pct={pct} size={72} stroke={7} className="hidden max-md:block">
          <span className="font-serif text-[20px] font-semibold">{pct}%</span>
        </ProgressRing>
        <div className="flex flex-col gap-2.5 min-w-0 max-md:gap-1.25">
          <div className="flex items-center gap-2.5 max-md:hidden">
            <ProviderTag provider={current.provider} />
            <span className="text-ink3 type-code">{current.code}</span>
            <span className="text-ink2 text-[13px]">
              <LevelBars level={current.level} />
            </span>
          </div>
          <span className="hidden text-ink3 type-code text-[11.5px] max-md:block">
            {current.provider.code} · {current.code} · In progress
          </span>
          <Link
            href={`/catalog/${current.slug}`}
            className="font-serif text-[30px] font-semibold leading-[1.15] text-ink no-underline max-md:text-[20px] max-md:leading-[1.2]"
          >
            {current.name}
          </Link>
          <span className="text-ink2 text-[14.5px] max-md:hidden">
            Started {dayMonth(current.startedAt)} · {doneCount} of {current.chapters.length}{' '}
            chapters done
          </span>
        </div>
      </div>
      <ul className="flex flex-col border-t border-ln" aria-label={`${current.code} chapters`}>
        {shown.map((chapter, i) => {
          const isDone = done.has(chapter.id);
          return (
            <li key={chapter.id} className={cn(i === WINDOW - 1 && 'max-md:hidden')}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-busy={pending.has(chapter.id)}
                onClick={() => onToggle(chapter.id)}
                className="flex items-center gap-3.5 w-full min-h-13 p-0 border-0 border-b border-ln bg-transparent text-start cursor-pointer max-md:gap-3 max-md:min-h-12.5"
              >
                <TickBox done={isDone} />
                <span className="w-6 text-ink3 type-code max-md:hidden">
                  {String(chapter.order).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'flex-1 text-[15px] font-medium max-md:text-[14.5px]',
                    isDone && 'text-ink3 line-through',
                  )}
                >
                  {chapter.title}
                </span>
                <span className="text-ink3 text-[13px] max-md:hidden">
                  {isDone ? 'Done' : studyTime(chapter.estimatedMinutes)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2.5">
        <Link
          href={syllabusHref}
          className={cn(buttonClass('primary'), 'max-md:flex-1 max-md:justify-center')}
        >
          See the full syllabus
          <Icon name="arrow_forward" size={19} className="max-md:hidden" />
        </Link>
      </div>
    </section>
  );
}
