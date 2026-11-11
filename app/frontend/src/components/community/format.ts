import {
  type CommunityScope,
  type Directory,
  type DirectoryQuery,
  DirectoryQuerySchema,
  type SpecialtyCode,
} from '@tekcert/types';

/** The filters the directory keeps in the URL. Pages aren't part of it: "Show more" adds them. */
export type DirectoryFilters = Omit<DirectoryQuery, 'page'>;

export const DEFAULT_FILTERS: DirectoryFilters = { scope: 'specialty' };

/** Reads the filters from the page URL; anything invalid falls back to "My specialty". */
export function parseDirectoryFilters(
  params: Record<string, string | string[] | undefined>,
): DirectoryFilters {
  const first = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      const single = Array.isArray(value) ? value[0] : value;
      return single ? [[key, single]] : [];
    }),
  );
  const filters: DirectoryFilters = { ...DEFAULT_FILTERS };
  // Field by field, so one bad value doesn't throw away the others.
  for (const key of ['scope', 'q', 'holds', 'help', 'specialty'] as const) {
    if (!(key in first)) continue;
    const parsed = DirectoryQuerySchema.safeParse({ [key]: first[key] });
    if (parsed.success) Object.assign(filters, { [key]: parsed.data[key] });
  }
  if (!filters.help) delete filters.help;
  return filters;
}

/** The ?scope=&q=… part of the page URL and of the API call. */
export function directorySearch(filters: DirectoryFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.scope !== DEFAULT_FILTERS.scope) params.set('scope', filters.scope);
  if (filters.q) params.set('q', filters.q);
  if (filters.holds) params.set('holds', filters.holds);
  if (filters.help) params.set('help', 'true');
  if (filters.specialty) params.set('specialty', filters.specialty);
  if (page > 1) params.set('page', String(page));
  return params.toString();
}

/** Filters besides the scope and the search box: the number on the phone's filter button. */
export function activeDirectoryFilters(filters: DirectoryFilters): number {
  return [filters.holds, filters.help, filters.specialty].filter(Boolean).length;
}

/** The group letter ends the class code: ING-4-CIM-A, ING-2-B. */
export function groupOf(classCode: string): string {
  return classCode.slice(classCode.lastIndexOf('-') + 1);
}

/** "ING-4 CIM · group A", or "ING-2 · group B" before a specialty. */
export function classLabel(person: {
  classCode: string;
  year: number;
  specialty: SpecialtyCode | null;
}): string {
  const group = `group ${groupOf(person.classCode)}`;
  return person.specialty
    ? `ING-${person.year} ${person.specialty} · ${group}`
    : `ING-${person.year} · ${group}`;
}

export interface ScopeLabel {
  value: CommunityScope;
  /** Phones and narrow screens: "My class". */
  short: string;
  /** Desktop: "My class · ING-4 A". */
  long: string;
}

/** The four scopes, named after the student asking. */
export function scopeLabels(viewer: Directory['viewer']): ScopeLabel[] {
  const year = viewer.year ? `ING-${viewer.year}` : null;
  const group = viewer.classCode && year ? `${year} ${groupOf(viewer.classCode)}` : null;
  const withDetail = (label: string, detail: string | null) =>
    detail ? `${label} · ${detail}` : label;
  return [
    { value: 'class', short: 'My class', long: withDetail('My class', group) },
    {
      value: 'specialty',
      short: 'My specialty',
      long: withDetail('My specialty', viewer.specialty),
    },
    { value: 'year', short: 'My level', long: withDetail('My level', year) },
    { value: 'institute', short: 'Institute', long: 'Whole institute' },
  ];
}

/** What follows the count: "CIM students", "student", "students". */
export function countNoun(total: number, filters: DirectoryFilters, viewer: Directory['viewer']) {
  const noun = total === 1 ? 'student' : 'students';
  const specialty =
    filters.specialty && filters.specialty !== 'none'
      ? filters.specialty
      : filters.scope === 'specialty' && !filters.specialty
        ? viewer.specialty
        : null;
  return specialty ? `${specialty} ${noun}` : noun;
}
