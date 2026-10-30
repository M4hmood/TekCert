import type {
  CertificationLevel,
  Group,
  PathNodeState,
  RecommendedPath,
  SpecialtyCode,
  Year,
} from '@tekcert/types';

/** Copy from design/Onboarding.dc.html. */

export const YEAR_CARDS: { year: Year; title: string; description: string }[] = [
  { year: 1, title: 'Preparatory cycle', description: 'Integrated cycle, year 1' },
  { year: 2, title: 'Preparatory cycle', description: 'Integrated cycle, year 2' },
  { year: 3, title: 'Common core', description: 'Direct entry after a bachelor’s' },
  { year: 4, title: 'Specialty', description: 'First specialty year' },
  { year: 5, title: 'Specialty', description: 'Final year, capstone project' },
];

/** Long names don't fit the 390 px rows. */
export const SPECIALTY_SHORT_NAMES: Partial<Record<SpecialtyCode, string>> = {
  SSIR: 'Systems & Network Security',
  DMWM: 'Mobile, Web & Multimedia',
};

export const groupLabel = (group: Group) => `Group ${group}`;

export function stepLabel(step: number, specialtyYear: boolean): string {
  switch (step) {
    case 1:
      return 'Step 1 of 4 · Year';
    case 2:
      return specialtyYear ? 'Step 2 of 4 · Specialty' : 'Step 2 of 4 · Target specialty and group';
    case 3:
      return 'Step 3 of 4 · Certifications earned';
    case 4:
      return 'Step 4 of 4 · Profile photo';
    default:
      return 'Recommended path';
  }
}

/** Provider chips are 110 px wide in the design. */
const PROVIDER_SHORT_NAMES: Record<string, string> = {
  AWS: 'AWS',
  AZURE: 'Microsoft',
  REDHAT: 'Red Hat',
  LF: 'Linux Fdn.',
  ECCOUNCIL: 'EC-Council',
  PYTHON: 'Python Inst.',
};

export function providerLabel(provider: { code: string; name: string }): string {
  return PROVIDER_SHORT_NAMES[provider.code] ?? provider.name;
}

export const LEVEL_LABEL: Record<CertificationLevel, string> = {
  foundational: 'Foundational',
  associate: 'Associate',
  professional: 'Professional',
  expert: 'Expert',
};

export const NODE_STATE: Record<PathNodeState, { icon: string; note: string }> = {
  held: { icon: 'pending', note: 'Unverified' },
  next: { icon: 'arrow_forward', note: 'Your next step' },
  available: { icon: 'radio_button_unchecked', note: 'Available' },
  locked: { icon: 'lock', note: 'Locked' },
};

export function pathTitle(path: RecommendedPath['path']): string {
  return path.hue === null ? path.name : `${path.code} · ${path.name}`;
}

export const REASON: Record<RecommendedPath['reason'], string> = {
  specialty: 'your specialty’s path',
  target: 'your target specialty',
  undecided: 'until you choose your specialty',
};

/** The specialty identity colour from the design tokens (identical in light and dark). */
export const hueColour = (hue: number, lightness = 0.6, chroma = 0.13) =>
  `oklch(${lightness} ${chroma} ${hue})`;
