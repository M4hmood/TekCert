'use client';

import type { ActivityFeed, BadgeState, ChapterTickResult, Dashboard } from '@tekcert/types';
import { cn, EmptyState, Toast } from '@tekcert/ui';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useChapterTicks } from '@/components/progress/use-chapter-ticks';
import { ActivityCard } from './ActivityCard';
import {
  AlsoPreparing,
  GroupStarted,
  LevelCard,
  LevelStrip,
  NextCard,
  NoviceCard,
  PathCard,
} from './cards';
import { CurrentCard } from './CurrentCard';
import { todayLabels } from './format';
import { StartCard } from './StartCard';

export interface DashboardViewProps {
  dashboard: Dashboard;
  activity: ActivityFeed | null;
  /** ISO time of the server render. */
  now: string;
}

/** The dashboard (design/Tableau-de-bord): filled, or empty for a student who hasn't started. */
export function DashboardView({ dashboard, activity, now }: DashboardViewProps) {
  const [points, setPoints] = useState(dashboard.points);
  const [level, setLevel] = useState(dashboard.level);
  const [badges, setBadges] = useState<readonly BadgeState[]>(dashboard.badges);

  const onResult = useCallback((result: ChapterTickResult) => {
    setPoints(result.points);
    setLevel(result.level);
    if (result.newBadges.length) {
      const at = new Date().toISOString();
      setBadges((prev) =>
        prev.map((b) => (result.newBadges.includes(b.key) ? { ...b, earnedAt: at } : b)),
      );
    }
  }, []);
  const ticks = useChapterTicks({
    initialDone: dashboard.current?.chapters.filter((c) => c.done).map((c) => c.id) ?? [],
    onResult,
  });

  const dates = todayLabels(new Date(now));
  const header = (
    <PageHeader
      title={`Hello ${dashboard.firstName}`}
      overline={
        dashboard.empty ? (
          'Welcome to TekCert'
        ) : (
          <>
            <span className="max-md:hidden">{dates.long}</span>
            <span className="hidden max-md:inline">{dates.short}</span>
          </>
        )
      }
    />
  );

  if (dashboard.empty) {
    return (
      <>
        {header}
        <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6 items-start max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-3.5">
          <div className="flex flex-col gap-6 max-md:contents">
            <div className="max-md:order-2">
              <StartCard next={dashboard.next} path={dashboard.path} />
            </div>
          </div>
          <div className="flex flex-col gap-6 max-md:contents">
            <div className="max-md:order-1">
              <NoviceCard level={level} />
            </div>
            <div className="max-md:order-3">
              <GroupStarted data={dashboard.groupStarted} group={dashboard.group} />
            </div>
          </div>
        </div>
        {dashboard.path && <PathCard path={dashboard.path} />}
        <div className="max-md:hidden">
          <ActivityCard initial={activity} now={now} />
        </div>
      </>
    );
  }

  const current = dashboard.current;
  return (
    <>
      {header}
      <LevelStrip points={points} level={level} />
      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6 items-start max-lg:grid-cols-[minmax(0,1fr)] max-md:gap-4">
        {current ? (
          <CurrentCard
            current={current}
            done={ticks.done}
            pending={ticks.pending}
            onToggle={(id) => void ticks.toggle(id)}
          />
        ) : (
          <EmptyState
            icon="clock_loader_40"
            title="Nothing in progress"
            action={
              <Link href="/catalog" className="font-semibold">
                Browse the catalog
              </Link>
            }
          >
            Start a certification to track its chapters here.
          </EmptyState>
        )}
        <div className="flex flex-col gap-6 max-md:gap-4">
          <LevelCard points={points} level={level} badges={badges} />
          <NextCard next={dashboard.next} path={dashboard.path} group={dashboard.group} />
        </div>
      </div>
      {dashboard.path && <PathCard path={dashboard.path} />}
      <div
        className={cn(
          'grid gap-6 items-start max-md:grid-cols-[minmax(0,1fr)] max-md:gap-4',
          current ? 'grid-cols-2 max-lg:grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]',
        )}
      >
        {current && (
          <AlsoPreparing
            code={current.code}
            data={dashboard.alsoPreparing}
            specialty={dashboard.specialty}
          />
        )}
        <ActivityCard initial={activity} now={now} />
      </div>
      {ticks.toast && (
        <Toast
          key={ticks.toast.id}
          message={ticks.toast.message}
          tone={ticks.toast.tone}
          action={ticks.toast.action}
        />
      )}
    </>
  );
}
