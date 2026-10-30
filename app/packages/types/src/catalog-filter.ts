import {
  CATALOG_SORTS,
  CERTIFICATION_LEVELS,
  type CatalogFacets,
  type CatalogSort,
  type CertificationListQuery,
  type CertificationSummary,
  CertificationListQuerySchema,
  SPECIALTY_CODES,
} from './catalog.js';

/**
 * The catalog's search, filter, sort and facet rules. The API, the server render of /catalog and
 * the browser all run these, so a shared link shows the same list everywhere.
 */

export const DEFAULT_CATALOG_SORT: CatalogSort = 'earned';

type Facet = 'provider' | 'level' | 'specialty';

/** Lowercase without accents, so "securite" finds "Sécurité". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function matches(cert: CertificationSummary, query: CertificationListQuery, skip?: Facet): boolean {
  const q = query.q ? fold(query.q.trim()) : '';
  if (q && !fold(`${cert.code} ${cert.name} ${cert.examCode ?? ''}`).includes(q)) return false;
  if (skip !== 'provider' && query.provider?.length) {
    if (!query.provider.includes(cert.provider.code)) return false;
  }
  if (skip !== 'level' && query.level?.length) {
    if (!query.level.includes(cert.level)) return false;
  }
  if (skip !== 'specialty' && query.specialty?.length && !cert.forAllSpecialties) {
    // Certifications for every specialty match any specialty filter.
    if (!cert.specialties.some((s) => query.specialty?.includes(s))) return false;
  }
  if (query.maxDifficulty && cert.difficulty > query.maxDifficulty) return false;
  return true;
}

const byName = (a: CertificationSummary, b: CertificationSummary) =>
  a.name.localeCompare(b.name, 'en');

const COMPARATORS: Record<
  CatalogSort,
  (a: CertificationSummary, b: CertificationSummary) => number
> = {
  earned: (a, b) => b.earnedCount - a.earnedCount || byName(a, b),
  name: byName,
  difficulty: (a, b) => a.difficulty - b.difficulty || byName(a, b),
  level: (a, b) =>
    CERTIFICATION_LEVELS.indexOf(a.level) - CERTIFICATION_LEVELS.indexOf(b.level) || byName(a, b),
};

export function sortCatalog<T extends CertificationSummary>(items: T[], sort?: CatalogSort): T[] {
  return [...items].sort(COMPARATORS[sort ?? DEFAULT_CATALOG_SORT]);
}

/** The certifications matching every filter, in the requested order. */
export function filterCatalog<T extends CertificationSummary>(
  items: T[],
  query: CertificationListQuery,
): T[] {
  return sortCatalog(
    items.filter((cert) => matches(cert, query)),
    query.sort,
  );
}

/**
 * How many certifications each option would show. A facet ignores its own filter, so ticking a
 * second provider shows how many it adds.
 */
export function catalogFacets(
  items: CertificationSummary[],
  query: CertificationListQuery,
): CatalogFacets {
  const count = (facet: Facet, keys: (cert: CertificationSummary) => readonly string[]) => {
    const counts: Record<string, number> = {};
    for (const cert of items) {
      if (!matches(cert, query, facet)) continue;
      for (const key of keys(cert)) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  };
  return {
    provider: count('provider', (cert) => [cert.provider.code]),
    level: count('level', (cert) => [cert.level]),
    specialty: count('specialty', (cert) =>
      cert.forAllSpecialties ? SPECIALTY_CODES : cert.specialties,
    ),
  };
}

/** How many filters are on (each provider, level and specialty counts once), for "Filters · 3". */
export function activeFilterCount(query: CertificationListQuery): number {
  return (
    (query.provider?.length ?? 0) +
    (query.level?.length ?? 0) +
    (query.specialty?.length ?? 0) +
    (query.maxDifficulty && query.maxDifficulty < 5 ? 1 : 0)
  );
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

/**
 * Reads a /catalog URL leniently: each parameter is checked on its own and a bad one is
 * dropped, so a hand-edited link still opens the catalog.
 */
export function parseCatalogQuery(
  params: SearchParamsRecord | URLSearchParams,
): CertificationListQuery {
  const get = (key: string): string | undefined => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    return (Array.isArray(value) ? value.join(',') : value) ?? undefined;
  };
  const query: CertificationListQuery = {};
  const shape = CertificationListQuerySchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const raw = get(key);
    if (raw === undefined || raw === '') continue;
    const parsed = shape[key].safeParse(raw);
    if (parsed.success && parsed.data !== undefined) {
      Object.assign(query, { [key]: parsed.data });
    } else if (key !== 'q' && key !== 'maxDifficulty' && key !== 'sort') {
      // Keep the valid values of a list that also holds bad ones.
      const valid = raw
        .split(',')
        .map((part) => shape[key].safeParse(part))
        .flatMap((r) => (r.success && r.data ? r.data : []));
      if (valid.length) Object.assign(query, { [key]: valid });
    }
  }
  if (query.provider) query.provider = [...new Set(query.provider)];
  return query;
}

/** The query string for a catalog URL, without empty or default values ("" when nothing is set). */
export function serializeCatalogQuery(query: CertificationListQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.provider?.length) params.set('provider', query.provider.join(','));
  if (query.level?.length) {
    params.set('level', CERTIFICATION_LEVELS.filter((l) => query.level?.includes(l)).join(','));
  }
  if (query.specialty?.length) {
    params.set('specialty', SPECIALTY_CODES.filter((s) => query.specialty?.includes(s)).join(','));
  }
  if (query.maxDifficulty && query.maxDifficulty < 5) {
    params.set('maxDifficulty', String(query.maxDifficulty));
  }
  if (query.sort && query.sort !== DEFAULT_CATALOG_SORT && CATALOG_SORTS.includes(query.sort)) {
    params.set('sort', query.sort);
  }
  // Commas stay readable in shared links.
  return params.toString().replaceAll('%2C', ',');
}
