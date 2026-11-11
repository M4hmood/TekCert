'use client';

import {
  type CommunityScope,
  type Directory,
  DIRECTORY_SEARCH_MAX,
  DIRECTORY_SEARCH_MIN,
  type DirectoryPerson,
  DirectorySchema,
} from '@tekcert/types';
import { Button, cn, Icon, Select, type SelectOption } from '@tekcert/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { specialtyColor } from '@/components/catalog/parts';
import { PageHeader } from '@/components/PageHeader';
import { formatPoints } from '@/components/progress/parts';
import { getJson, withSessionRefresh } from '@/lib/client-api';
import { HelpToggle, specialtyChipLabel } from './controls';
import { DirectoryFilterSheet } from './DirectoryFilterSheet';
import {
  activeDirectoryFilters,
  classLabel,
  countNoun,
  type DirectoryFilters,
  directorySearch,
  scopeLabels,
} from './format';

export interface HoldableCertification {
  slug: string;
  code: string;
}

export interface DirectoryViewProps {
  /** Parsed from the URL on the server, so a shared link opens filtered. */
  initialFilters: DirectoryFilters;
  /** The first page, rendered on the server. Null when it could not be loaded. */
  initial: Directory | null;
  /** Certifications at least one student holds, for the "Holds" filter. */
  holdable: HoldableCertification[];
}

const SEARCH_DEBOUNCE_MS = 300;
const NO_VIEWER: Directory['viewer'] = { classCode: null, year: null, specialty: null };

/** The student directory: scope, search, filters and the people they give. */
export function DirectoryView({ initialFilters, initial, holdable }: DirectoryViewProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState(initialFilters.q ?? '');
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(initial === null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const latest = useRef(0);

  const fetchPage = (next: DirectoryFilters, page: number) => {
    const query = directorySearch(next, page);
    return withSessionRefresh(() =>
      getJson(`/community/students${query ? `?${query}` : ''}`, DirectorySchema),
    );
  };

  const load = async (next: DirectoryFilters) => {
    setFilters(next);
    const query = directorySearch(next);
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    const request = ++latest.current;
    setLoading(true);
    const result = await fetchPage(next, 1);
    // A slower earlier answer must not replace a newer one.
    if (request !== latest.current) return;
    setLoading(false);
    setFailed(!result.ok);
    if (result.ok) setData(result.data);
  };

  const loadMore = async () => {
    if (!data) return;
    const request = latest.current;
    setLoadingMore(true);
    const result = await fetchPage(filters, data.page + 1);
    setLoadingMore(false);
    // The filters changed while this page was on its way: it belongs to another list.
    if (request !== latest.current) return;
    setFailed(!result.ok);
    if (result.ok) {
      const known = new Set(data.items.map((person) => person.id));
      setData({
        ...result.data,
        items: [...data.items, ...result.data.items.filter((person) => !known.has(person.id))],
      });
    }
  };

  // The search runs once typing pauses, and only from two characters on.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const term = search.trim();
    const q = term.length >= DIRECTORY_SEARCH_MIN ? term : undefined;
    if (q === filters.q) return;
    const timer = setTimeout(() => void loadRef.current({ ...filters, q }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filters]);

  const viewer = data?.viewer ?? NO_VIEWER;
  const scopes = scopeLabels(viewer);
  const setScope = (scope: CommunityScope) => {
    // The specialty chips belong to the wider scopes; a narrower one drops the choice.
    void load({ ...filters, scope, specialty: undefined });
  };
  const anyFilter = !!filters.q || activeDirectoryFilters(filters) > 0;
  const clear = () => {
    setSearch('');
    void load({ scope: filters.scope });
  };
  const showChips = filters.scope === 'institute' || filters.scope === 'year';
  const holdOptions: SelectOption<string>[] = [
    { value: '', label: 'any certification' },
    ...holdable.map((cert) => ({ value: cert.slug, label: cert.code })),
  ];
  const filterCount = activeDirectoryFilters(filters);

  return (
    <>
      <PageHeader
        title="Community"
        description="Find who's preparing or holds a certification, and ask them for advice."
        actions={
          <ScopeSwitch
            scopes={scopes}
            value={filters.scope}
            onChange={setScope}
            className="max-lg:hidden"
            long
          />
        }
      />
      <div className="flex flex-col gap-5.5 min-w-0 max-md:gap-3.5">
        <ScopeSwitch
          scopes={scopes}
          value={filters.scope}
          onChange={setScope}
          className="hidden max-lg:grid"
        />
        <div className="flex flex-wrap items-center gap-3 max-md:flex-nowrap max-md:gap-2">
          <label className="relative flex flex-1 min-w-70 max-md:min-w-0">
            <Icon
              name="search"
              size={21}
              className="absolute start-3.5 top-3 text-ink3 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              maxLength={DIRECTORY_SEARCH_MAX}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, certification…"
              aria-label="Search for a student"
              className="flex-1 min-w-0 h-11.5 ps-11 pe-3.5 border-[1.5px] border-ln2 rounded-[10px] bg-sf text-[15px] placeholder:text-ink3"
            />
          </label>
          <span className="contents max-md:hidden">
            <Select
              label="Holds"
              value={filters.holds ?? ''}
              options={holdOptions}
              onChange={(holds) => void load({ ...filters, holds: holds || undefined })}
            />
            <HelpToggle
              on={!!filters.help}
              onToggle={() => void load({ ...filters, help: filters.help ? undefined : true })}
            />
          </span>
          <button
            type="button"
            className="relative hidden flex-none place-items-center size-11.5 border-[1.5px] border-ln2 rounded-[10px] bg-sf cursor-pointer max-md:grid"
            aria-label={filterCount ? `Filters · ${filterCount} active` : 'Filters'}
            onClick={() => setSheetOpen(true)}
          >
            <Icon name="tune" size={21} />
            {filterCount > 0 && (
              <span className="absolute -top-1.25 -end-1.25 grid place-items-center min-w-4.5 h-4.5 rounded-[9px] bg-pri text-pri-ink text-[11px] font-bold">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {showChips && data && data.specialties.length > 0 && (
          <div role="group" aria-label="Specialty" className="flex flex-wrap gap-2 max-md:hidden">
            {data.specialties.map(({ code, count }) => {
              const on = filters.specialty === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => void load({ ...filters, specialty: on ? undefined : code })}
                  className={cn(
                    'flex items-center gap-2 h-9 ps-2.5 pe-3.5 border-[1.5px] border-ln2 rounded-[18px] bg-sf text-[13.5px] font-semibold cursor-pointer',
                    on && 'border-pri bg-pri-sf',
                  )}
                >
                  <span
                    className="size-2.5 rounded-full bg-ink3"
                    style={code === 'none' ? undefined : { background: specialtyColor(code) }}
                  />
                  {specialtyChipLabel(code)}
                  <span className="font-medium text-ink3">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {failed && (
          <p role="alert" className="text-err text-[14px]">
            The directory could not be loaded.{' '}
            <button
              type="button"
              className="p-0 border-none bg-transparent text-pri font-semibold underline cursor-pointer"
              onClick={() => void load(filters)}
            >
              Try again
            </button>
          </p>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between min-h-9 max-md:min-h-0 max-md:px-1">
              <span className="text-ink2 text-[14px] max-md:text-[13px]" aria-live="polite">
                <strong className="text-ink">{data.total}</strong>{' '}
                {countNoun(data.total, filters, viewer)}
              </span>
              {anyFilter && data.total > 0 && (
                <button
                  type="button"
                  className="h-9 px-2.5 border-none bg-transparent text-pri text-[14px] font-semibold cursor-pointer"
                  onClick={clear}
                >
                  Clear filters
                </button>
              )}
            </div>

            {data.total === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-14 px-6 border-[1.5px] border-dashed border-ln2 rounded-[16px] text-center">
                <Icon name="person_search" size={36} className="text-ink3" />
                <h2 className="font-serif text-[22px] font-semibold">Nobody matches</h2>
                <p className="text-ink2 text-[14.5px]">
                  {filters.scope === 'institute'
                    ? 'Remove a filter or try another search.'
                    : 'Widen the scope to the whole institute or remove a filter.'}
                </p>
                {anyFilter && (
                  <Button variant="secondary" className="mt-1.5" onClick={clear}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <ul
                aria-label="Students"
                aria-busy={loading}
                className={cn(
                  'grid grid-cols-3 gap-4 transition-opacity duration-150 max-xl:grid-cols-2',
                  'max-md:flex max-md:flex-col max-md:gap-0 max-md:border max-md:border-ln max-md:rounded-[14px] max-md:bg-sf',
                  loading && 'opacity-55',
                )}
              >
                {data.items.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </ul>
            )}

            {data.items.length < data.total && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Show more'}
                </Button>
                <span className="text-ink3 text-[13px]">
                  Showing {data.items.length} of {data.total}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {sheetOpen && (
        <DirectoryFilterSheet
          filters={filters}
          holdOptions={holdOptions}
          specialties={showChips ? (data?.specialties ?? []) : []}
          onClose={() => setSheetOpen(false)}
          onApply={(next) => {
            setSheetOpen(false);
            void load(next);
          }}
        />
      )}
    </>
  );
}

function ScopeSwitch({
  scopes,
  value,
  onChange,
  className,
  long = false,
}: {
  scopes: ReturnType<typeof scopeLabels>;
  value: CommunityScope;
  onChange: (scope: CommunityScope) => void;
  className?: string;
  long?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Scope"
      className={cn(
        long ? 'inline-flex' : 'grid-cols-4',
        'gap-0.5 p-1 rounded-[10px] bg-sf2',
        className,
      )}
    >
      {scopes.map((scope) => {
        const on = scope.value === value;
        return (
          <button
            key={scope.value}
            type="button"
            aria-pressed={on}
            title={scope.long}
            onClick={() => !on && onChange(scope.value)}
            className={cn(
              'h-9.5 px-3.5 border-none rounded-[7px] bg-transparent text-ink2 text-[13.5px] font-semibold whitespace-nowrap cursor-pointer',
              !long && 'px-1 text-[13px] max-md:text-[12.5px]',
              on && 'bg-sf text-ink shadow-[0_1px_2px_rgba(19,26,44,.12)]',
            )}
          >
            {long ? (
              <>
                <span className="max-xl:hidden">{scope.long}</span>
                <span className="hidden max-xl:inline">{scope.short}</span>
              </>
            ) : (
              scope.short
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A card on desktop, a list row on phones. The whole thing opens the profile. */
function PersonCard({ person }: { person: DirectoryPerson }) {
  const name = `${person.firstName} ${person.lastName}`;
  const group = classLabel(person);
  const heldLine = person.held.length
    ? person.held
        .slice(0, 2)
        .map((cert) => cert.code)
        .join(', ')
    : 'No certifications';
  return (
    <li className="min-w-0 max-md:border-b max-md:border-ln max-md:last:border-b-0">
      <Link
        href={person.isMe ? '/profile' : `/community/${person.id}`}
        aria-label={`${name}${person.isMe ? ' (you)' : ''}, ${group}`}
        className="flex flex-col gap-3.5 h-full p-4.5 border border-ln rounded-[14px] bg-sf text-ink no-underline hover:border-ln2 hover:shadow-[0_2px_8px_rgba(19,26,44,.06)] max-md:flex-row max-md:items-center max-md:gap-3 max-md:min-h-12 max-md:py-3 max-md:px-3.5 max-md:border-none max-md:rounded-none max-md:bg-transparent max-md:hover:shadow-none"
      >
        <div className="flex flex-1 items-center gap-3 min-w-0 max-md:contents">
          <Avatar
            firstName={person.firstName}
            lastName={person.lastName}
            avatarPath={person.avatarPath}
            className={cn(
              'size-12 text-[18px] max-md:size-10 max-md:text-[15px]',
              // Three certifications or more: the gold ring.
              person.earnedCount >= 3 &&
                'shadow-[0_0_0_2px_var(--sf),0_0_0_3.5px_var(--gold-fill)]',
            )}
          />
          <span className="flex flex-1 flex-col gap-0.75 min-w-0 max-md:gap-0.5">
            <span className="flex items-center gap-1.5 text-[15.5px] font-semibold max-md:text-[14.5px]">
              <span className="truncate">{name}</span>
              {person.isMe && (
                <span className="flex-none text-ink3 text-[12px] font-semibold">· you</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-ink2 text-[13px] max-md:hidden">
              <span
                className="flex-none size-2 rounded-full bg-ink3"
                style={person.specialty ? { background: specialtyColor(person.specialty) } : {}}
              />
              <span className="truncate">{group}</span>
            </span>
            <span className="hidden text-ink3 text-[12.5px] truncate max-md:block">
              ING-{person.year} · {heldLine}
            </span>
          </span>
          {person.availableToHelp && (
            <span
              title="Available to help"
              className="grid flex-none place-items-center size-8 rounded-full bg-ok-sf text-ok max-md:size-auto max-md:bg-transparent"
            >
              <Icon name="volunteer_activism" size={18} label="Available to help" />
            </span>
          )}
          <Icon
            name="chevron_right"
            size={20}
            className="hidden flex-none text-ink3 max-md:block"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-7 max-md:hidden">
          {person.held.map((cert) => (
            <span
              key={cert.slug}
              className="inline-flex items-center gap-1 h-6.5 px-2 border border-dashed border-ln2 rounded-[6px] text-ink2 type-code"
            >
              <Icon name="workspace_premium" size={14} label="Earned, unverified:" />
              {cert.code}
            </span>
          ))}
          {person.preparing.map((cert) => (
            <span
              key={cert.slug}
              className="inline-flex items-center gap-1 h-6.5 px-2.25 rounded-[6px] bg-sf2 text-ink2 type-code"
            >
              <Icon name="hourglass_top" size={14} label="In progress:" />
              {cert.code}
            </span>
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-ln text-ink3 text-[13px] max-md:hidden">
          <span>
            {person.earnedCount} earned · {person.preparingCount} in progress
          </span>
          {person.points === null ? (
            <span className="font-semibold">{person.level.name}</span>
          ) : (
            <span className="text-gold font-semibold">{formatPoints(person.points)} pts</span>
          )}
        </div>
      </Link>
    </li>
  );
}
