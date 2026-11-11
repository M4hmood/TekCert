'use client';

import {
  type ActivityFeed,
  ActivityFeedSchema,
  COMMUNITY_SCOPES,
  type CommunityScope,
} from '@tekcert/types';
import { Button, cn, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { getJson, withSessionRefresh } from '@/lib/client-api';
import { CARD } from './cards';
import { activityLine, timeAgo } from './format';

const SCOPE_LABELS: Record<CommunityScope, { label: string; short: string }> = {
  class: { label: 'My class', short: 'Class' },
  specialty: { label: 'My specialty', short: 'Specialty' },
  year: { label: 'My level', short: 'Level' },
  institute: { label: 'Whole institute', short: 'Institute' },
};

export interface ActivityCardProps {
  /** The feed for "My specialty", rendered on the server. Null when it failed to load. */
  initial: ActivityFeed | null;
  /** ISO time of the server render, so "2 h ago" reads the same before and after hydration. */
  now: string;
  /** Lines shown: 5 on desktop, the first 3 on phones. */
  limit?: number;
}

type State =
  | { kind: 'ready'; feed: ActivityFeed }
  | { kind: 'loading'; feed: ActivityFeed | null }
  | { kind: 'error' };

/** Classmate activity with its scope switch (tabs on desktop, chips on phones). */
export function ActivityCard({ initial, now, limit = 5 }: ActivityCardProps) {
  const [scope, setScope] = useState<CommunityScope>('specialty');
  const [state, setState] = useState<State>(
    initial ? { kind: 'ready', feed: initial } : { kind: 'error' },
  );
  const latest = useRef(0);
  const nowDate = new Date(now);

  const load = async (next: CommunityScope) => {
    setScope(next);
    latest.current += 1;
    const request = latest.current;
    setState((prev) => ({ kind: 'loading', feed: prev.kind === 'error' ? null : prev.feed }));
    const result = await withSessionRefresh(() =>
      getJson(`/activity?scope=${next}`, ActivityFeedSchema),
    );
    // A slower answer for a scope the student has already left is dropped.
    if (request !== latest.current) return;
    setState(result.ok ? { kind: 'ready', feed: result.data } : { kind: 'error' });
  };

  const feed = state.kind === 'error' ? null : state.feed;
  const items = feed?.items.slice(0, limit) ?? [];

  return (
    <section
      aria-label="Classmate activity"
      className={cn(
        CARD,
        'gap-1.5 p-6 max-md:p-0 max-md:border-none max-md:bg-transparent max-md:gap-1',
      )}
    >
      <h3 className="mb-2.5 font-serif text-[20px] font-semibold max-md:mt-2 max-md:mx-1 max-md:mb-1.5">
        Classmate activity
      </h3>
      <div
        role="group"
        aria-label="Whose activity"
        className="grid grid-cols-4 gap-0.5 mb-2 p-0.75 rounded-[9px] bg-sf2 max-md:flex max-md:gap-1.5 max-md:p-0 max-md:pb-2 max-md:bg-transparent max-md:overflow-x-auto"
      >
        {COMMUNITY_SCOPES.map((s) => {
          const on = s === scope;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              title={SCOPE_LABELS[s].label}
              onClick={() => void load(s)}
              className={cn(
                'h-8.5 p-0 border-none rounded-[7px] bg-transparent text-ink2 text-[12.5px] font-semibold cursor-pointer',
                on && 'bg-sf text-ink shadow-[0_1px_2px_rgba(19,26,44,.12)]',
                'max-md:flex-none max-md:h-10 max-md:px-3.5 max-md:border-[1.5px] max-md:border-solid max-md:border-ln2 max-md:rounded-[20px] max-md:bg-sf max-md:text-ink max-md:text-[13.5px] max-md:shadow-none',
                on && 'max-md:border-pri max-md:bg-pri max-md:text-pri-ink',
              )}
            >
              <span className="max-md:hidden">{SCOPE_LABELS[s].short}</span>
              <span className="hidden max-md:inline">{SCOPE_LABELS[s].label}</span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite" aria-busy={state.kind === 'loading'}>
        {state.kind === 'error' ? (
          <div className="flex flex-col items-start gap-2 py-3 border-t border-ln">
            <span className="text-ink2 text-[14px]">The activity couldn&apos;t be loaded.</span>
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load(scope)}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-3 border-t border-ln text-ink2 text-[14px]">
            {state.kind === 'loading'
              ? 'Loading…'
              : 'Nothing yet in this group. Be the first to finish a chapter.'}
          </p>
        ) : (
          <ul className={cn(state.kind === 'loading' && 'opacity-60')}>
            {items.map((item, i) => {
              const line = activityLine(item);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 py-2.5 border-t border-ln max-md:px-1',
                    i >= 3 && 'max-md:hidden',
                  )}
                >
                  <span
                    className={cn(
                      'grid flex-none place-items-center size-7.5 rounded-full',
                      line.tone,
                    )}
                  >
                    <Icon name={line.icon} size={17} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] leading-[1.4]">
                      <Link
                        href={`/community/${item.person.id}`}
                        className="text-ink font-bold no-underline hover:underline"
                      >
                        {item.person.firstName}
                      </Link>{' '}
                      {line.what}
                    </span>
                    <span className="text-ink3 text-[12.5px]">
                      {item.person.group} · {timeAgo(item.at, nowDate)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
