'use client';

import { type MyCertification, MyCertificationSchema, percentDone } from '@tekcert/types';
import { cn, Icon, Tabs, TabsContent, TabsList, TabsTrigger, Toast } from '@tekcert/ui';
import { type ReactNode, useMemo, useState } from 'react';
import { ProgressRing } from '@/components/progress/parts';
import { useChapterTicks } from '@/components/progress/use-chapter-ticks';
import { putJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';
import { dayMonth } from './format';
import { type CertificationProgress, CertificationProgressContext } from './progress-context';
import { parseTab, type Tab, TABS } from './tabs';

const TAB_LABELS: Record<Tab, { label: string; short: string }> = {
  overview: { label: 'Overview', short: 'Overview' },
  syllabus: { label: 'Syllabus', short: 'Syllabus' },
  resources: { label: 'Recommended resources', short: 'Resources' },
  community: { label: 'Community', short: 'Community' },
};

export interface CertificationViewProps {
  slug: string;
  code: string;
  /** The header's left column (provider, title, facts), rendered on the server. */
  header: ReactNode;
  /** Breadcrumb and back arrow row. */
  topBar: ReactNode;
  panels: Record<Tab, ReactNode>;
  counts: Partial<Record<Tab, number>>;
  initialTab: Tab;
  initialStatus: MyCertification | null;
  /** Chapters I ticked (in progress only). */
  initialDoneChapterIds?: readonly string[];
  /** Chapters in the syllabus, for the ring. */
  chapterTotal: number;
  preparingCount: number;
}

/**
 * The certification page's interactive frame: the status card with "Start" and the tabs. The
 * tab lives in the URL (?tab=syllabus) so links and reloads keep it; panels are server-rendered.
 */
export function CertificationView(props: CertificationViewProps) {
  const [tab, setTab] = useState<Tab>(props.initialTab);
  const [status, setStatus] = useState(props.initialStatus);
  const toaster = useToast();
  const ticks = useChapterTicks({ initialDone: props.initialDoneChapterIds ?? [], toaster });
  const canTick = status?.status === 'in_progress';
  const progress = useMemo<CertificationProgress>(
    () => ({
      canTick,
      canStart: status === null,
      done: ticks.done,
      pending: ticks.pending,
      toggle: (id) => void ticks.toggle(id),
    }),
    [canTick, status, ticks],
  );

  const select = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <CertificationProgressContext value={progress}>
      <Tabs value={tab} onValueChange={(next) => select(parseTab(next))} className="contents">
        <section className="flex flex-col gap-5.5 -mt-8 -mx-10 px-10 pt-7 border-b border-ln bg-sf max-md:gap-3.5 max-md:-mt-5 max-md:-mx-4 max-md:px-4 max-md:pt-3">
          {props.topBar}
          <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-12 items-start max-cert:grid-cols-[minmax(0,1fr)] max-cert:gap-7 max-md:gap-4">
            {props.header}
            <StatusCard
              slug={props.slug}
              status={status}
              preparingCount={props.preparingCount}
              done={ticks.done.size}
              total={props.chapterTotal}
              onStarted={(started) => {
                setStatus(started);
                select('syllabus');
                toaster.show(`${props.code} started · tick chapters as you revise them`);
              }}
              onContinue={() => select('syllabus')}
            />
          </div>
          <TabsList
            aria-label="Certification sections"
            className="flex gap-1 mt-1 overflow-x-auto [scrollbar-width:none]"
          >
            {TABS.map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="flex flex-none items-center gap-2 h-12 px-4 border-none bg-transparent text-ink2 text-[15px] font-medium cursor-pointer data-[state=active]:shadow-[inset_0_-2.5px_0_var(--pri)] data-[state=active]:text-pri data-[state=active]:font-semibold max-md:px-3 max-md:text-[14px]"
              >
                <span className="max-md:hidden">{TAB_LABELS[t].label}</span>
                <span className="hidden max-md:inline">{TAB_LABELS[t].short}</span>
                {props.counts[t] !== undefined && (
                  <span className="py-0.5 px-1.75 rounded-[9px] bg-sf2 text-ink2 text-[12px] font-semibold max-md:hidden">
                    {props.counts[t]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </section>
        {TABS.map((t) => (
          // Kept mounted: the panels are rendered on the server and hold their own state.
          <TabsContent key={t} value={t} forceMount hidden={tab !== t} className="pt-1 pb-2">
            {props.panels[t]}
          </TabsContent>
        ))}
        {toaster.toast && (
          <Toast
            key={toaster.toast.id}
            message={toaster.toast.message}
            tone={toaster.toast.tone}
            action={toaster.toast.action}
          />
        )}
      </Tabs>
    </CertificationProgressContext>
  );
}

const SEAL = {
  available: '',
  in_progress: 'border-6 border-pri-sf text-pri',
  unverified: 'border-2 border-dashed border-gold-fill text-gold',
};
const CHIP = {
  available: '',
  in_progress: 'border-pri-sf bg-pri-sf text-pri',
  unverified: 'border-dashed border-ln2 bg-transparent text-ink2',
};

function StatusCard({
  slug,
  status,
  preparingCount,
  done,
  total,
  onStarted,
  onContinue,
}: {
  slug: string;
  status: MyCertification | null;
  preparingCount: number;
  done: number;
  total: number;
  onStarted: (status: MyCertification) => void;
  onContinue: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    const result = await withSessionRefresh(() =>
      putJson(`/me/preparations/${slug}`, {}, MyCertificationSchema),
    );
    setBusy(false);
    if (result.ok) onStarted(result.data);
    else setError(result.problem.detail ?? 'It could not be started. Try again.');
  };

  const state = status?.status ?? 'available';
  const pct = percentDone(done, total);
  const view = {
    available: {
      seal: <Icon name="radio_button_unchecked" size={28} />,
      chip: { icon: 'radio_button_unchecked', label: 'Available' },
      note:
        preparingCount === 0
          ? 'Nobody is preparing it yet'
          : `${preparingCount} ${preparingCount === 1 ? 'student' : 'students'} preparing it`,
    },
    in_progress: {
      seal: <Icon name="clock_loader_40" size={28} />,
      chip: { icon: 'clock_loader_40', label: 'In progress' },
      note: status ? `Started ${dayMonth(status.since)} · ${done}/${total} chapters` : '',
    },
    unverified: {
      seal: <Icon name="workspace_premium" size={30} />,
      chip: { icon: 'pending', label: 'Unverified' },
      note: status ? `Declared ${dayMonth(status.since)}` : '',
    },
  }[state];

  return (
    <section
      className="flex flex-col gap-4 p-5.5 border border-ln rounded-[16px] bg-bg max-cert:max-w-120 max-md:max-w-none max-md:p-4 max-md:gap-3"
      aria-label="My status"
    >
      <div className="flex items-center gap-3.5">
        {state === 'in_progress' ? (
          <>
            <ProgressRing pct={pct} size={64} stroke={6} className="max-md:hidden">
              <span className="font-serif text-[17px] font-semibold">{pct}%</span>
            </ProgressRing>
            <ProgressRing pct={pct} size={48} stroke={5} className="hidden max-md:block">
              <span className="font-serif text-[14px] font-semibold">{pct}%</span>
            </ProgressRing>
          </>
        ) : (
          <span
            className={cn(
              'grid flex-none place-items-center size-16 border-[1.5px] border-ln2 rounded-full text-ink2 max-md:size-12',
              SEAL[state],
            )}
          >
            {view.seal}
          </span>
        )}
        <div className="flex flex-col gap-1.25">
          <span className="text-ink3 type-overline">My status</span>
          <span
            className={cn(
              'inline-flex items-center self-start gap-1.25 h-7 ps-2 pe-2.75 border-[1.5px] border-sf2 rounded-[14px] bg-sf2 text-ink text-[13px] font-semibold',
              CHIP[state],
            )}
          >
            <Icon name={view.chip.icon} size={17} />
            {view.chip.label}
          </span>
          <span className="text-ink2 text-[13px]">{view.note}</span>
        </div>
      </div>
      {state === 'available' && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-12 border-none rounded-[10px] bg-pri text-pri-ink text-[15px] font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-progress"
          onClick={start}
          disabled={busy}
          aria-busy={busy}
        >
          <Icon name="play_arrow" size={20} />
          {busy ? 'Starting…' : 'Start'}
        </button>
      )}
      {state === 'in_progress' && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-12 border-none rounded-[10px] bg-pri text-pri-ink text-[15px] font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-progress"
          onClick={onContinue}
        >
          Continue the syllabus
          <Icon name="arrow_forward" size={20} />
        </button>
      )}
      {state === 'unverified' && (
        <p className="text-ink3 text-[12.5px] leading-[1.45]">
          You declared it during onboarding. Proof upload and verification come in a later release.
        </p>
      )}
      {error && (
        <p role="alert" className="text-err text-[13.5px]">
          {error}
        </p>
      )}
    </section>
  );
}
