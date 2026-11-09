'use client';

import {
  activeFilterCount,
  type CatalogSort,
  catalogFacets,
  type CertificationListQuery,
  type CertificationSummary,
  filterCatalog,
  type MyCertificationStatus,
  paginateCatalog,
  type Provider,
  serializeCatalogQuery,
  SPECIALTY_CODES,
  type SpecialtyCode,
} from '@tekcert/types';
import { Button, cn, EmptyState, Icon, Select, CheckboxBox } from '@tekcert/ui';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { DifficultyPicker, LevelToggles, toggle } from './controls';
import { FilterSheet } from './FilterSheet';
import { Pagination } from './Pagination';
import {
  CertBadge,
  DifficultyDots,
  LEVEL_LABELS,
  LevelBars,
  providerColor,
  ProviderTag,
  shortProviderName,
  SPECIALTY_NAMES,
  specialtyColor,
  SpecialtyTags,
  StatusPill,
} from './parts';

export const SORT_LABELS: Record<CatalogSort, string> = {
  earned: 'Most earned',
  name: 'Name A–Z',
  difficulty: 'Easiest first',
  level: 'Level',
};

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as CatalogSort[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

export interface CatalogViewProps {
  certifications: CertificationSummary[];
  /** Parsed from the URL on the server, so a shared link renders filtered on first paint. */
  initialQuery: CertificationListQuery;
  initialPage: number;
  /** slug → my status; empty when it could not be loaded. */
  mine: Record<string, MyCertificationStatus>;
}

const SEARCH_DEBOUNCE_MS = 250;

/** Search, filters and results. Everything runs in the browser over the 56 certifications. */
export function CatalogView({ certifications, initialQuery, initialPage, mine }: CatalogViewProps) {
  const [query, setQuery] = useState<CertificationListQuery>(initialQuery);
  const [search, setSearch] = useState(initialQuery.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  // A page belongs to the filters it was picked under: any other filter starts again at page 1.
  const queryKey = serializeCatalogQuery(query);
  const [picked, setPicked] = useState({ page: initialPage, queryKey });
  const content = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);

  const results = useMemo(() => filterCatalog(certifications, query), [certifications, query]);
  const facets = useMemo(() => catalogFacets(certifications, query), [certifications, query]);
  const providers = useMemo(() => uniqueProviders(certifications), [certifications]);
  const current = paginateCatalog(results, picked.queryKey === queryKey ? picked.page : 1);

  // Keep the URL in step without a server round trip (Next syncs history.replaceState).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const search = serializeCatalogQuery(query, current.page);
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [query, current.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) =>
        (current.q ?? '') === search.trim() ? current : withQ(current, search.trim()),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const goToPage = (page: number) => {
    setPicked({ page, queryKey });
    // The button pressed can become disabled, so focus moves to the new results.
    grid.current?.focus({ preventScroll: true });
    content.current?.scrollIntoView({ block: 'start' });
  };

  const update = (changes: Partial<CertificationListQuery>) =>
    setQuery((current) => clean({ ...current, ...changes }));
  const clearFilters = () => setQuery((current) => clean({ q: current.q, sort: current.sort }));
  const clearSearch = () => {
    setSearch('');
    setQuery((current) => withQ(current, ''));
  };
  const toggleProvider = (code: string) => update({ provider: toggle(query.provider, code) });

  const chips = activeChips(query, providers, update);
  const filterCount = activeFilterCount(query);
  const searchOnly = !!query.q && filterCount === 0;
  const countLabel = `${results.length === 1 ? 'certification' : 'certifications'}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_248px] gap-8 items-start max-lg:grid-cols-[minmax(0,1fr)_220px] max-lg:gap-6 max-md:block">
      <section aria-label="Filters" className="flex flex-col row-1 col-2 gap-6.5 max-md:hidden">
        <fieldset className="flex flex-col gap-1 min-w-0">
          <legend className="pb-2 text-ink3 type-overline">Provider</legend>
          {providers.map((p) => (
            <CheckRow
              key={p.code}
              checked={!!query.provider?.includes(p.code)}
              onToggle={() => toggleProvider(p.code)}
              count={facets.provider[p.code] ?? 0}
              mark={
                <span
                  className="flex-none size-2 rounded-[2px]"
                  style={{ background: providerColor(p.hue) }}
                />
              }
            >
              {p.name}
            </CheckRow>
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-1 min-w-0">
          <legend className="pb-2 text-ink3 type-overline">Certification level</legend>
          <LevelToggles value={query.level} onChange={(level) => update({ level })} />
        </fieldset>
        <fieldset className="flex flex-col gap-1 min-w-0">
          <legend className="pb-2 text-ink3 type-overline">Specialty</legend>
          {SPECIALTY_CODES.map((code) => (
            <CheckRow
              key={code}
              checked={!!query.specialty?.includes(code)}
              onToggle={() => update({ specialty: toggle(query.specialty, code) })}
              count={facets.specialty[code] ?? 0}
              mark={
                <span
                  className="flex-none size-2.25 rounded-full"
                  style={{ background: specialtyColor(code) }}
                />
              }
              title={SPECIALTY_NAMES[code]}
              strong
            >
              {code}
            </CheckRow>
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-1 min-w-0">
          <legend className="pb-2 text-ink3 type-overline">Maximum difficulty</legend>
          <DifficultyPicker
            value={query.maxDifficulty ?? 5}
            onChange={(maxDifficulty) => update({ maxDifficulty })}
          />
          <span className="mt-1.5 text-ink3 text-[13px]">
            {(query.maxDifficulty ?? 5) === 5 ? 'Any difficulty' : `Up to ${query.maxDifficulty}/5`}
          </span>
        </fieldset>
      </section>

      <div ref={content} className="flex flex-col gap-4.5 min-w-0 max-md:gap-3">
        <div className="flex gap-3">
          <label className="flex flex-1 items-center gap-2.5 h-12 ps-3.5 pe-2 border-[1.5px] border-ln2 rounded-[10px] bg-sf focus-within:border-pri">
            <Icon name="search" className="text-ink3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code (e.g. AZ-104)"
              aria-label="Search the catalog"
              maxLength={80}
              className="flex-1 min-w-0 px-0.5 border-none bg-transparent outline-none text-[15.5px] placeholder:text-[#8a8e9c] [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                className="grid place-items-center size-9 border-none rounded-[8px] bg-transparent text-ink3 cursor-pointer"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </label>
          <div className="[--select-height:48px] [--select-min-width:181px] max-md:hidden">
            <Select
              label="Sort:"
              value={query.sort ?? 'earned'}
              options={SORT_OPTIONS}
              onChange={(sort) => update({ sort })}
            />
          </div>
        </div>

        <div className="hidden gap-2 -me-4 pe-4 overflow-x-auto [scrollbar-width:none] max-md:flex">
          <button
            type="button"
            className="inline-flex flex-none items-center gap-1.5 h-10 px-3.5 border-[1.5px] border-pri rounded-[20px] bg-pri text-pri-ink text-[14px] font-semibold cursor-pointer"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <Icon name="tune" size={18} />
            Filters{filterCount ? ` · ${filterCount}` : ''}
          </button>
          {providers.map((p) => {
            const on = !!query.provider?.includes(p.code);
            return (
              <button
                key={p.code}
                type="button"
                aria-pressed={on}
                className={cn(
                  'inline-flex flex-none items-center gap-1.75 h-10 px-3.5 border-[1.5px] border-ln2 rounded-[20px] bg-sf text-[14px] font-semibold cursor-pointer',
                  on && 'border-pri bg-pri-sf text-pri',
                )}
                onClick={() => toggleProvider(p.code)}
              >
                <span
                  className="flex-none size-2 rounded-[2px]"
                  style={{ background: providerColor(p.hue) }}
                />
                {shortProviderName(p)}
              </button>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-2.5 min-h-9 max-md:min-h-0"
          aria-live="polite"
        >
          <span className="text-ink2 text-[14.5px] max-md:text-[13.5px] [&_strong]:text-ink">
            <strong>{results.length}</strong> {countLabel}
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex items-center gap-1 h-8 ps-3 pe-2 border-none rounded-[16px] bg-pri-sf text-pri text-[13px] font-semibold cursor-pointer max-md:hidden"
              onClick={chip.remove}
              aria-label={`Remove ${chip.label}`}
            >
              {chip.label}
              <Icon name="close" size={17} />
            </button>
          ))}
          {chips.length > 0 && (
            <button
              type="button"
              className="h-8 px-1.5 border-none bg-transparent text-pri text-[13.5px] font-semibold underline cursor-pointer max-md:hidden"
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}
        </div>

        {results.length > 0 ? (
          <>
            <ul
              ref={grid}
              tabIndex={-1}
              className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4.5 focus:outline-none *:flex max-md:grid-cols-[minmax(0,1fr)] max-md:gap-2.5"
            >
              {current.items.map((cert) => (
                <li key={cert.slug}>
                  <CertCard cert={cert} status={mine[cert.slug]} />
                </li>
              ))}
            </ul>
            <Pagination
              page={current.page}
              pageCount={current.pageCount}
              first={current.first}
              last={current.last}
              total={results.length}
              onChange={goToPage}
            />
          </>
        ) : searchOnly ? (
          <EmptyState
            icon="search_off"
            title={`No results for “${query.q}”`}
            action={
              <Button variant="primary" onClick={clearSearch}>
                Clear search
              </Button>
            }
          >
            The institute doesn&apos;t fund this certification yet. Try “DevOps” or an exam code.
          </EmptyState>
        ) : (
          <EmptyState
            icon="search_off"
            title="No certification matches"
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setSearch('');
                  setQuery((current) => clean({ sort: current.sort }));
                }}
              >
                Clear filters
              </Button>
            }
          >
            Widen the difficulty or remove a filter. You can also suggest a certification to the
            administration.
          </EmptyState>
        )}
      </div>

      {sheetOpen && (
        <FilterSheet
          certifications={certifications}
          query={query}
          onClose={() => setSheetOpen(false)}
          onApply={(next) => {
            setQuery(clean(next));
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CertCard({
  cert,
  status,
}: {
  cert: CertificationSummary;
  status: MyCertificationStatus | undefined;
}) {
  const earned = cert.earnedCount === 1 ? 'student earned it' : 'students earned it';
  return (
    <Link
      href={`/catalog/${cert.slug}`}
      className="flex flex-1 flex-col gap-3.5 p-5 border border-ln rounded-card bg-sf text-ink no-underline transition-[border-color,box-shadow] duration-150 hover:border-ln2 hover:shadow-[0_10px_28px_-14px_rgba(19,26,44,0.3)] max-md:gap-2.5 max-md:p-4"
    >
      <span className="flex items-center justify-between gap-2">
        <ProviderTag provider={cert.provider} short />
        <span
          className={cn('text-ink3 font-mono font-medium text-[12px] leading-4.5', 'max-md:hidden')}
        >
          {cert.code}
        </span>
        {status && (
          <span className="hidden max-md:flex">
            <StatusPill status={status} small />
          </span>
        )}
      </span>
      <span className="flex items-start justify-between gap-3 min-h-12.5 max-md:min-h-0">
        <span className="font-serif text-[21px] font-semibold leading-[1.2] max-md:text-[19px]">
          {cert.name}
        </span>
        <CertBadge
          code={cert.code}
          badgeAsset={cert.badgeAsset}
          provider={cert.provider}
          size={48}
        />
      </span>
      <span
        className={cn('flex flex-wrap items-center gap-3.5 text-ink2 text-[13px]', 'max-md:hidden')}
      >
        <LevelBars level={cert.level} />
        <DifficultyDots difficulty={cert.difficulty} />
      </span>
      <SpecialtyTags specialties={cert.specialties} forAll={cert.forAllSpecialties} />
      <span
        className={cn(
          'flex items-center justify-between gap-2 mt-auto pt-3.5 border-t border-ln',
          'max-md:hidden',
        )}
      >
        <span className="text-ink2 text-[13px] [&_strong]:text-ink [&_strong]:font-serif [&_strong]:text-[17px]">
          <strong>{cert.earnedCount}</strong> {earned}
        </span>
        {status && <StatusPill status={status} />}
      </span>
      <span
        className={cn(
          'flex-wrap items-center gap-3 text-ink2 text-[12.5px] [&_strong]:text-ink',
          'hidden max-md:flex',
        )}
      >
        <span className="font-mono">{cert.code}</span>
        <span>{LEVEL_LABELS[cert.level]}</span>
        <span>Difficulty {cert.difficulty}/5</span>
        <span>
          <strong>{cert.earnedCount}</strong> earned
        </span>
      </span>
    </Link>
  );
}

function CheckRow({
  checked,
  onToggle,
  count,
  mark,
  title,
  strong = false,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  count: number;
  mark: ReactNode;
  title?: string;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className="relative flex items-center gap-2.5 min-h-10 text-[14.5px] cursor-pointer"
      title={title}
    >
      <CheckboxBox
        iconSize={16}
        className="size-5 rounded-[5px] bg-transparent"
        checked={checked}
        onCheckedChange={onToggle}
      />
      {mark}
      <span className={cn('flex-1', strong && 'font-semibold')}>{children}</span>
      <span className="text-ink3 text-[13px]">{count}</span>
    </label>
  );
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

function activeChips(
  query: CertificationListQuery,
  providers: Provider[],
  update: (changes: Partial<CertificationListQuery>) => void,
): Chip[] {
  const name = (code: string) => providers.find((p) => p.code === code)?.name ?? code;
  return [
    ...(query.provider ?? []).map((code) => ({
      key: `p-${code}`,
      label: name(code),
      remove: () => update({ provider: query.provider?.filter((c) => c !== code) }),
    })),
    ...(query.level ?? []).map((level) => ({
      key: `l-${level}`,
      label: LEVEL_LABELS[level],
      remove: () => update({ level: query.level?.filter((l) => l !== level) }),
    })),
    ...(query.specialty ?? []).map((code) => ({
      key: `s-${code}`,
      label: code,
      remove: () => update({ specialty: query.specialty?.filter((s) => s !== code) }),
    })),
    ...(query.maxDifficulty && query.maxDifficulty < 5
      ? [
          {
            key: 'd',
            label: `Difficulty ≤ ${query.maxDifficulty}`,
            remove: () => update({ maxDifficulty: undefined }),
          },
        ]
      : []),
  ];
}

/** Drops empty lists and defaults, so state and URL stay minimal. */
export function clean(query: CertificationListQuery): CertificationListQuery {
  const out: CertificationListQuery = {};
  if (query.q) out.q = query.q;
  if (query.provider?.length) out.provider = query.provider;
  if (query.level?.length) out.level = query.level;
  if (query.specialty?.length) out.specialty = query.specialty as SpecialtyCode[];
  if (query.maxDifficulty && query.maxDifficulty < 5) out.maxDifficulty = query.maxDifficulty;
  if (query.sort && query.sort !== 'earned') out.sort = query.sort;
  return out;
}

function withQ(query: CertificationListQuery, q: string): CertificationListQuery {
  return clean({ ...query, q });
}

function uniqueProviders(items: CertificationSummary[]): Provider[] {
  const byCode = new Map(items.map((c) => [c.provider.code, c.provider]));
  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
