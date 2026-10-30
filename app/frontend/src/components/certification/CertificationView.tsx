'use client';

import { type MyCertification, MyCertificationSchema } from '@tekcert/types';
import { cx, Icon } from '@tekcert/ui';
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { putJson, withSessionRefresh } from '@/lib/client-api';
import { dayMonth } from './format';
import { type Tab, TABS } from './tabs';
import styles from './certification.module.css';

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
  preparingCount: number;
}

/**
 * The certification page's interactive frame: the status card with "Start" and the tabs. The
 * tab lives in the URL (?tab=syllabus) so links and reloads keep it; panels are server-rendered.
 */
export function CertificationView(props: CertificationViewProps) {
  const [tab, setTab] = useState<Tab>(props.initialTab);
  const [status, setStatus] = useState(props.initialStatus);
  const [toast, setToast] = useState<string | null>(null);

  const select = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    overview: null,
    syllabus: null,
    resources: null,
    community: null,
  });
  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length] ?? 'overview';
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <section className={styles.band}>
        {props.topBar}
        <div className={styles.hero}>
          {props.header}
          <StatusCard
            slug={props.slug}
            status={status}
            preparingCount={props.preparingCount}
            onStarted={(started) => {
              setStatus(started);
              select('syllabus');
              setToast(`${props.code} started · it is now in progress`);
            }}
            onContinue={() => select('syllabus')}
          />
        </div>
        <div role="tablist" aria-label="Certification sections" className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              className={cx(styles.tab, tab === t && styles.tabOn)}
              onClick={() => select(t)}
              onKeyDown={onTabKey}
            >
              <span className={styles.tabLong}>{TAB_LABELS[t].label}</span>
              <span className={styles.tabShort}>{TAB_LABELS[t].short}</span>
              {props.counts[t] !== undefined && (
                <span className={styles.tabCount}>{props.counts[t]}</span>
              )}
            </button>
          ))}
        </div>
      </section>
      {TABS.map((t) => (
        <section
          key={t}
          id={`panel-${t}`}
          role="tabpanel"
          aria-labelledby={`tab-${t}`}
          hidden={tab !== t}
          className={styles.panel}
        >
          {props.panels[t]}
        </section>
      ))}
      {toast && (
        <div role="status" className={styles.toast}>
          <Icon name="check_circle" size={20} />
          {toast}
        </div>
      )}
    </>
  );
}

function StatusCard({
  slug,
  status,
  preparingCount,
  onStarted,
  onContinue,
}: {
  slug: string;
  status: MyCertification | null;
  preparingCount: number;
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
      note: status ? `Started ${dayMonth(status.since)}` : '',
    },
    unverified: {
      seal: <Icon name="workspace_premium" size={30} />,
      chip: { icon: 'pending', label: 'Unverified' },
      note: status ? `Declared ${dayMonth(status.since)}` : '',
    },
  }[state];

  return (
    <section className={styles.statusCard} aria-label="My status">
      <div className={styles.statusTop}>
        <span className={cx(styles.seal, styles[`seal_${state}`])}>{view.seal}</span>
        <div className={styles.statusText}>
          <span className={styles.overline}>My status</span>
          <span className={cx(styles.statusChip, styles[`chip_${state}`])}>
            <Icon name={view.chip.icon} size={17} />
            {view.chip.label}
          </span>
          <span className={styles.statusNote}>{view.note}</span>
        </div>
      </div>
      {state === 'available' && (
        <button
          type="button"
          className={styles.primaryAction}
          onClick={start}
          disabled={busy}
          aria-busy={busy}
        >
          <Icon name="play_arrow" size={20} />
          {busy ? 'Starting…' : 'Start'}
        </button>
      )}
      {state === 'in_progress' && (
        <button type="button" className={styles.primaryAction} onClick={onContinue}>
          Go to the syllabus
          <Icon name="arrow_forward" size={20} />
        </button>
      )}
      {state === 'unverified' && (
        <p className={styles.statusHint}>
          You declared it during onboarding. Proof upload and verification come in a later release.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.statusError}>
          {error}
        </p>
      )}
    </section>
  );
}
