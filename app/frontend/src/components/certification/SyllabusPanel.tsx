'use client';

import type { CertificationDomain } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import { TickBox } from '@/components/progress/parts';
import { studyTime } from './format';
import { useCertificationProgress } from './progress-context';

/**
 * The Syllabus tab. While the certification is in progress every chapter is a checkbox (+10
 * points); before Start the boxes show disabled; a held certification has none.
 */
export function SyllabusPanel({
  domains,
  chapterCount,
}: {
  domains: CertificationDomain[];
  chapterCount: number;
}) {
  const { canTick, canStart, done, pending, toggle } = useCertificationProgress();
  const doneCount = domains
    .flatMap((d) => d.chapters)
    .filter((chapter) => done.has(chapter.id)).length;

  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 items-start [&>div]:gap-6 max-cert:grid-cols-[minmax(0,1fr)] max-cert:gap-7">
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">
            Official syllabus
          </h2>
          <span className="text-ink2 text-[15px] [&_strong]:text-ink [&_strong]:font-serif [&_strong]:text-[22px]">
            {canTick ? (
              <>
                <strong>{doneCount}</strong> / {chapterCount} chapters
              </>
            ) : (
              <>
                <strong>{chapterCount}</strong> chapters
              </>
            )}
          </span>
        </div>
        {canStart && (
          <p className="flex items-center gap-2 py-2.5 px-3.5 rounded-[10px] bg-pri-sf text-pri text-[14px] font-medium">
            <Icon name="info" size={19} />
            Start this certification to tick chapters and earn points.
          </p>
        )}
        {domains.map((d) => (
          <section
            key={d.order}
            className="overflow-hidden border border-ln rounded-card bg-sf"
            aria-label={d.title}
          >
            <div className="flex items-center justify-between gap-3 py-3.5 px-4.5 bg-sf2">
              <span className="text-[14.5px] font-semibold">
                <span className="max-md:hidden">
                  Domain {d.order} · {d.title}
                </span>
                <span className="hidden max-md:inline">{d.shortTitle}</span>
              </span>
              <span className="text-ink3 text-[13px]">
                {d.chapters.length} {d.chapters.length === 1 ? 'chapter' : 'chapters'}
                {d.weightPct !== null && ` · ${d.weightPct}%`}
              </span>
            </div>
            <ol>
              {d.chapters.map((c) => {
                const isDone = done.has(c.id);
                const row = (
                  <>
                    {(canTick || canStart) && <TickBox done={isDone} />}
                    <span className="w-5.5 text-ink3 font-mono font-medium text-[12.5px] leading-4.5">
                      {String(c.order).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-[15px] font-medium',
                        isDone && 'text-ink3 line-through',
                      )}
                    >
                      {c.title}
                    </span>
                    <span className="text-ink3 text-[13px]">
                      {isDone ? 'Done' : studyTime(c.estimatedMinutes)}
                    </span>
                  </>
                );
                const rowClass =
                  'flex items-center gap-3.5 w-full min-h-14 py-2 px-4.5 text-start max-md:gap-2.5 max-md:px-3.5';
                return (
                  <li key={c.order} className="border-t border-ln">
                    {canTick || canStart ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-busy={pending.has(c.id)}
                        disabled={!canTick}
                        onClick={() => toggle(c.id)}
                        className={cn(
                          rowClass,
                          'border-none bg-transparent cursor-pointer hover:bg-sf2/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
                        )}
                      >
                        {row}
                      </button>
                    ) : (
                      <div className={rowClass}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <aside className="flex flex-col gap-3 p-5.5 border border-ln rounded-[16px] bg-sf">
        <span className="text-[14.5px] font-semibold">How it works</span>
        <span className="text-ink2 text-[14px] leading-[1.6]">
          Tick a chapter once you&apos;ve revised it with the recommended resources. Each chapter
          earns 10 points. Classmates see your percentage, never the details.
        </span>
      </aside>
    </div>
  );
}
