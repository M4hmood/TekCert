import type { CertificationSummary, Provider, PublicStats } from '@tekcert/types';

/** The order the providers are shown in (design/Landing, then the ones added since). */
const PROVIDER_ORDER = [
  'CISCO',
  'AWS',
  'AZURE',
  'ORACLE',
  'REDHAT',
  'LF',
  'ECCOUNCIL',
  'INE',
  'PYTHON',
  'HUAWEI',
];
/** Badges drawn at the top of a provider card, and certifications listed under it. */
export const SHOWCASE_BADGES = 6;
export const SHOWCASE_ROWS = 6;

export interface ProviderShowcase {
  provider: Provider;
  certifications: CertificationSummary[];
}

/** The catalog by provider, in display order, each provider's certifications by level. */
export function groupByProvider(items: readonly CertificationSummary[]): ProviderShowcase[] {
  const LEVELS = ['foundational', 'associate', 'professional', 'expert'];
  const groups = new Map<string, ProviderShowcase>();
  for (const cert of items) {
    const group = groups.get(cert.provider.code) ?? { provider: cert.provider, certifications: [] };
    group.certifications.push(cert);
    groups.set(cert.provider.code, group);
  }
  const position = (code: string) => {
    const index = PROVIDER_ORDER.indexOf(code);
    return index < 0 ? PROVIDER_ORDER.length : index;
  };
  return [...groups.values()]
    .map((group) => ({
      ...group,
      certifications: [...group.certifications].sort(
        (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.code.localeCompare(b.code),
      ),
    }))
    .sort(
      (a, b) =>
        position(a.provider.code) - position(b.provider.code) ||
        a.provider.name.localeCompare(b.provider.name),
    );
}

/** "CLF-C02 → SAA-C03 → SAP-C02" for a specialty card. */
export function trackLine(track: readonly string[], length: number, separator = ' → '): string {
  return track.slice(0, length).join(separator);
}

/** "Fall semester 2026": the semester the numbers are about, in Tunis time. */
export function semesterLabel(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const month = read('month');
  // Fall runs September to January, so January still belongs to the fall that started.
  return month >= 9 || month === 1
    ? `Fall semester ${read('year') - (month === 1 ? 1 : 0)}`
    : `Spring semester ${read('year')}`;
}

/** The longest bar of "Preparing by specialty". */
export function maxPreparing(stats: PublicStats): number {
  return Math.max(0, ...stats.bySpecialty.map((specialty) => specialty.preparing));
}
