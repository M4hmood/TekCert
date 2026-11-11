'use client';

import {
  type CertificationCommunity,
  CertificationCommunitySchema,
  type CommunityList,
  type CommunityPerson,
  type CommunityQuery,
  type CommunityScope,
  type CommunitySpecialtyFilter,
  SPECIALTY_CODES,
  YEARS,
} from '@tekcert/types';
import { cn, Icon, Select, type SelectOption, ToggleGroup, ToggleGroupItem } from '@tekcert/ui';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/catalog/parts';
import { getJson, withSessionRefresh } from '@/lib/client-api';
import { monthYear } from './format';
import { communitySearch } from './tabs';

const SCOPES: { value: CommunityScope; label: string }[] = [
  { value: 'class', label: 'My class' },
  { value: 'specialty', label: 'My specialty' },
  { value: 'year', label: 'My level' },
  { value: 'institute', label: 'Whole institute' },
];

const ALL = { value: '', label: 'All' } as const;

const SPECIALTY_OPTIONS: SelectOption<CommunitySpecialtyFilter | ''>[] = [
  ALL,
  ...SPECIALTY_CODES.map((code) => ({ value: code, label: code })),
  { value: 'none', label: 'Not yet (ING-1 to 3)' },
];

const LEVEL_OPTIONS: SelectOption<string>[] = [
  ALL,
  ...YEARS.map((year) => ({ value: String(year), label: `ING-${year}` })),
];

/** "Who to ask?": students who hold the certification and students preparing it. */
export function CommunityPanel({
  slug,
  initialQuery,
  initialData,
}: {
  slug: string;
  initialQuery: CommunityQuery;
  /** Null when the server could not load it; the panel then loads on its own. */
  initialData: CertificationCommunity | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(initialData === null);
  const latest = useRef(0);

  const load = async (next: CommunityQuery) => {
    setQuery(next);
    const url = new URL(window.location.href);
    for (const key of ['scope', 'specialty', 'year']) url.searchParams.delete(key);
    for (const [key, value] of new URLSearchParams(communitySearch(next))) {
      url.searchParams.set(key, value);
    }
    window.history.replaceState(null, '', url);

    const request = ++latest.current;
    setLoading(true);
    const search = communitySearch(next);
    const result = await withSessionRefresh(() =>
      getJson(
        `/certifications/${slug}/community${search ? `?${search}` : ''}`,
        CertificationCommunitySchema,
      ),
    );
    // A slower earlier answer must not replace a newer one.
    if (request !== latest.current) return;
    setLoading(false);
    setFailed(!result.ok);
    if (result.ok) setData(result.data);
  };

  const filtered = query.scope !== 'institute' || !!query.specialty || !!query.year;

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-[28px] font-medium max-md:text-[23px]">Who to ask?</h2>
        <p className="text-ink2 text-[14.5px]">
          Students who hold it or are preparing it. Write to them at their institute email.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          role="radiogroup"
          aria-label="Scope"
          className="inline-flex gap-0.5 p-1 rounded-[10px] bg-sf2 max-md:w-full max-md:overflow-x-auto"
          value={query.scope}
          onValueChange={(value) => {
            const scope = SCOPES.find((s) => s.value === value)?.value;
            if (scope) load({ ...query, scope });
          }}
        >
          {SCOPES.map((s) => (
            <ToggleGroupItem
              key={s.value}
              value={s.value}
              className="h-9.5 px-3.5 border-none rounded-[7px] bg-transparent text-ink2 text-[13.5px] font-semibold whitespace-nowrap cursor-pointer data-[state=on]:bg-sf data-[state=on]:text-ink data-[state=on]:shadow-raised"
            >
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          label="Specialty"
          value={query.specialty ?? ''}
          options={SPECIALTY_OPTIONS}
          onChange={(specialty) => load({ ...query, specialty: specialty || undefined })}
        />
        <Select
          label="Level"
          value={query.year ? String(query.year) : ''}
          options={LEVEL_OPTIONS}
          onChange={(level) => {
            const year = YEARS.find((y) => String(y) === level);
            load({ ...query, year });
          }}
        />
        {filtered && (
          <button
            type="button"
            className="h-11 px-1.5 border-none bg-transparent text-pri text-[14px] font-semibold underline cursor-pointer"
            onClick={() => load({ scope: 'institute' })}
          >
            Reset
          </button>
        )}
      </div>

      {failed && (
        <p role="alert" className="text-err text-[13.5px]">
          The list could not be loaded.{' '}
          <button
            type="button"
            className="p-0 border-none bg-transparent text-pri font-semibold underline cursor-pointer"
            onClick={() => load(query)}
          >
            Try again
          </button>
        </p>
      )}

      {data && (
        <div
          className={cn(
            'grid grid-cols-2 gap-6 items-start transition-opacity duration-150 max-md:grid-cols-[minmax(0,1fr)]',
            loading && 'opacity-55',
          )}
          aria-busy={loading}
        >
          <PeopleList title="Earned it" list={data.earned} kind="earned" />
          <PeopleList title="Preparing it" list={data.preparing} kind="preparing" />
        </div>
      )}
    </div>
  );
}

function PeopleList({
  title,
  list,
  kind,
}: {
  title: string;
  list: CommunityList;
  kind: 'earned' | 'preparing';
}) {
  return (
    <section
      className="flex flex-col py-5 px-5.5 border border-ln rounded-[16px] bg-sf max-md:p-4"
      aria-label={title}
    >
      <div className="flex items-baseline justify-between pb-3">
        <h3 className="font-serif text-[21px] font-semibold">{title}</h3>
        <span className="text-ink2 text-[14px]">{list.total}</span>
      </div>
      {list.items.length === 0 ? (
        <p className="py-5 border-t border-ln text-ink3 text-[14px]">Nobody for this filter yet.</p>
      ) : (
        <ul>
          {list.items.map((person) => (
            <PersonRow key={person.id} person={person} kind={kind} />
          ))}
        </ul>
      )}
      {list.total > list.items.length && (
        <p className="text-ink3 text-[13px]">
          Showing the {list.items.length} most recent of {list.total}.
        </p>
      )}
    </section>
  );
}

function PersonRow({ person, kind }: { person: CommunityPerson; kind: 'earned' | 'preparing' }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <li className="flex items-center gap-3 min-h-15 border-t border-ln">
      <Avatar
        firstName={person.firstName}
        lastName={person.lastName}
        avatarPath={person.avatarPath}
        className="size-10 text-[15px]"
      />
      <span className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="text-[14.5px] font-semibold">{name}</span>
        <span className="text-ink3 text-[13px]">
          {person.classCode} ·{' '}
          {kind === 'earned' ? monthYear(person.since) : `started ${monthYear(person.since)}`}
        </span>
      </span>
      {kind === 'earned' && <StatusPill status="unverified" small />}
      {kind === 'preparing' && person.pct !== null && (
        // A percentage only, never which chapters (design: "Classmates see your percentage").
        <span className="flex flex-none items-center gap-2">
          <span className="w-14 h-1.25 rounded-[3px] bg-sf2 max-md:hidden" aria-hidden>
            <span
              className="block h-full rounded-[3px] bg-pri"
              style={{ width: `${person.pct}%` }}
            />
          </span>
          <span className="w-9 text-end text-[13px] font-semibold">
            {person.pct}%<span className="sr-only"> of the syllabus done</span>
          </span>
        </span>
      )}
      <a
        href={`mailto:${person.email}`}
        className="grid flex-none place-items-center size-10 rounded-[8px] text-ink2 hover:bg-sf2 hover:text-pri"
        aria-label={`Email ${name}`}
        title={person.email}
      >
        <Icon name="mail" size={20} />
      </a>
    </li>
  );
}
