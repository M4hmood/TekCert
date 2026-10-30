'use client';

import {
  activeFilterCount,
  type CatalogSort,
  catalogFacets,
  type CertificationListQuery,
  type CertificationSummary,
  filterCatalog,
  type MyCertificationStatus,
  type Provider,
  serializeCatalogQuery,
  SPECIALTY_CODES,
  type SpecialtyCode,
} from '@tekcert/types';
import { Button, cx, EmptyState, Icon } from '@tekcert/ui';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { DifficultyPicker, LevelToggles, toggle } from './controls';
import { FilterSheet } from './FilterSheet';
import styles from './catalog.module.css';
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

export interface CatalogViewProps {
  certifications: CertificationSummary[];
  /** Parsed from the URL on the server, so a shared link renders filtered on first paint. */
  initialQuery: CertificationListQuery;
  /** slug → my status; empty when it could not be loaded. */
  mine: Record<string, MyCertificationStatus>;
}

const SEARCH_DEBOUNCE_MS = 250;

/** Search, filters and results. Everything runs in the browser over the 56 certifications. */
export function CatalogView({ certifications, initialQuery, mine }: CatalogViewProps) {
  const [query, setQuery] = useState<CertificationListQuery>(initialQuery);
  const [search, setSearch] = useState(initialQuery.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keep the URL in step without a server round trip (Next syncs history.replaceState).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const search = serializeCatalogQuery(query);
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) =>
        (current.q ?? '') === search.trim() ? current : withQ(current, search.trim()),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const results = useMemo(() => filterCatalog(certifications, query), [certifications, query]);
  const facets = useMemo(() => catalogFacets(certifications, query), [certifications, query]);
  const providers = useMemo(() => uniqueProviders(certifications), [certifications]);

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
    <div className={styles.layout}>
      <section aria-label="Filters" className={styles.filters}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Provider</legend>
          {providers.map((p) => (
            <CheckRow
              key={p.code}
              checked={!!query.provider?.includes(p.code)}
              onToggle={() => toggleProvider(p.code)}
              count={facets.provider[p.code] ?? 0}
              mark={<span className={styles.square} style={{ background: providerColor(p.hue) }} />}
            >
              {p.name}
            </CheckRow>
          ))}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Certification level</legend>
          <LevelToggles value={query.level} onChange={(level) => update({ level })} />
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Specialty</legend>
          {SPECIALTY_CODES.map((code) => (
            <CheckRow
              key={code}
              checked={!!query.specialty?.includes(code)}
              onToggle={() => update({ specialty: toggle(query.specialty, code) })}
              count={facets.specialty[code] ?? 0}
              mark={<span className={styles.round} style={{ background: specialtyColor(code) }} />}
              title={SPECIALTY_NAMES[code]}
              strong
            >
              {code}
            </CheckRow>
          ))}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Maximum difficulty</legend>
          <DifficultyPicker
            value={query.maxDifficulty ?? 5}
            onChange={(maxDifficulty) => update({ maxDifficulty })}
          />
          <span className={styles.hint}>
            {(query.maxDifficulty ?? 5) === 5 ? 'Any difficulty' : `Up to ${query.maxDifficulty}/5`}
          </span>
        </fieldset>
      </section>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Icon name="search" className={styles.searchIcon} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code (e.g. AZ-104)"
              aria-label="Search the catalog"
              maxLength={80}
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </label>
          <label className={styles.sort}>
            <span className={styles.sortLabel}>Sort:</span>
            <select
              value={query.sort ?? 'earned'}
              onChange={(e) => update({ sort: e.target.value as CatalogSort })}
              className={styles.sortSelect}
            >
              {(Object.keys(SORT_LABELS) as CatalogSort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
            <Icon name="expand_more" size={20} className={styles.sortIcon} />
          </label>
        </div>

        <div className={styles.mobileFilters}>
          <button
            type="button"
            className={styles.filtersButton}
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
                className={cx(styles.providerChip, on && styles.providerChipOn)}
                onClick={() => toggleProvider(p.code)}
              >
                <span className={styles.square} style={{ background: providerColor(p.hue) }} />
                {shortProviderName(p)}
              </button>
            );
          })}
        </div>

        <div className={styles.summary} aria-live="polite">
          <span className={styles.count}>
            <strong>{results.length}</strong> {countLabel}
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              onClick={chip.remove}
              aria-label={`Remove ${chip.label}`}
            >
              {chip.label}
              <Icon name="close" size={17} />
            </button>
          ))}
          {chips.length > 0 && (
            <button type="button" className={styles.clearAll} onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        {results.length > 0 ? (
          <ul className={styles.grid}>
            {results.map((cert) => (
              <li key={cert.slug}>
                <CertCard cert={cert} status={mine[cert.slug]} />
              </li>
            ))}
          </ul>
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
    <Link href={`/catalog/${cert.slug}`} className={styles.card}>
      <span className={styles.cardTop}>
        <ProviderTag provider={cert.provider} short />
        <span className={cx(styles.code, styles.desktopOnly)}>{cert.code}</span>
        {status && (
          <span className={styles.mobileOnly}>
            <StatusPill status={status} small />
          </span>
        )}
      </span>
      <span className={styles.cardTitleRow}>
        <span className={styles.cardTitle}>{cert.name}</span>
        <CertBadge
          code={cert.code}
          badgeAsset={cert.badgeAsset}
          provider={cert.provider}
          size={48}
        />
      </span>
      <span className={cx(styles.meta, styles.desktopOnly)}>
        <LevelBars level={cert.level} />
        <DifficultyDots difficulty={cert.difficulty} />
      </span>
      <SpecialtyTags specialties={cert.specialties} forAll={cert.forAllSpecialties} />
      <span className={cx(styles.cardFoot, styles.desktopOnly)}>
        <span className={styles.earned}>
          <strong>{cert.earnedCount}</strong> {earned}
        </span>
        {status && <StatusPill status={status} />}
      </span>
      <span className={cx(styles.mobileMeta, styles.mobileOnly)}>
        <span className={styles.mono}>{cert.code}</span>
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
    <label className={styles.checkRow} title={title}>
      <input type="checkbox" checked={checked} onChange={onToggle} className={styles.checkInput} />
      <span className={styles.checkBox} aria-hidden>
        {checked && <Icon name="check" size={16} />}
      </span>
      {mark}
      <span className={cx(styles.checkLabel, strong && styles.checkStrong)}>{children}</span>
      <span className={styles.checkCount}>{count}</span>
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
