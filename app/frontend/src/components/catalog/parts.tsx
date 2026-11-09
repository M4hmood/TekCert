import type {
  CertificationLevel,
  MyCertificationStatus,
  Provider,
  SpecialtyCode,
} from '@tekcert/types';
import { CERTIFICATION_LEVELS } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import Image from 'next/image';
import type { CSSProperties } from 'react';

/** Small pieces shared by the catalog cards and the certification page. */

const BAR_HEIGHT = ['h-1', 'h-1.75', 'h-2.5', 'h-3'];
const BAR_HEIGHT_LARGE = ['h-1.25', 'h-2', 'h-2.75', 'h-3.5'];

export const LEVEL_LABELS: Record<CertificationLevel, string> = {
  foundational: 'Foundational',
  associate: 'Associate',
  professional: 'Professional',
  expert: 'Expert',
};

export const SPECIALTY_NAMES: Record<SpecialtyCode, string> = {
  SDIA: 'AI & Data Science',
  CIM: 'Cloud Infrastructure Management',
  GLOps: 'Software Engineering & DevOps',
  SSIR: 'Systems Security & Network Infrastructure',
  AIOT: 'AI & IoT',
  DMWM: 'Mobile, Web & Multimedia Development',
};

/** Provider identity colour: a neutral dot, never a logo (Design-System). */
export const providerColor = (hue: number) => `oklch(0.66 0.14 ${hue})`;
export const specialtyColor = (code: SpecialtyCode) => `var(--spec-${code.toLowerCase()})`;

/** Where badge files are served from: /badges locally, CloudFront later (no data migration). */
const BADGE_BASE_URL = (process.env.NEXT_PUBLIC_BADGE_BASE_URL ?? '/badges').replace(/\/$/, '');

export function ProviderTag({ provider, short = false }: { provider: Provider; short?: boolean }) {
  return (
    <span className="inline-flex flex-none items-center gap-1.75 h-6 px-2.25 border border-ln2 rounded-[6px] text-ink2 text-[12px] font-semibold whitespace-nowrap">
      <span className="size-2 rounded-[2px]" style={{ background: providerColor(provider.hue) }} />
      {short ? shortProviderName(provider) : provider.name}
    </span>
  );
}

/** "Microsoft Azure" → "Azure", "Amazon Web Services" → "AWS" for chips on small screens. */
export function shortProviderName(provider: Provider): string {
  if (provider.code === 'AWS') return 'AWS';
  return provider.name.replace(/^(Microsoft|The) /, '');
}

export function LevelBars({
  level,
  large = false,
}: {
  level: CertificationLevel;
  large?: boolean;
}) {
  const rank = CERTIFICATION_LEVELS.indexOf(level);
  return (
    <span
      className={cn('inline-flex items-center gap-1.75', large && 'gap-2 text-[14px] font-medium')}
    >
      <span className={cn('inline-flex items-end gap-0.5 h-3', large && 'h-3.5')} aria-hidden>
        {CERTIFICATION_LEVELS.map((l, i) => (
          <span
            key={l}
            className={cn(
              'w-0.75 bg-ln2',
              (large ? BAR_HEIGHT_LARGE : BAR_HEIGHT)[i],
              large && 'w-1 rounded-[1px]',
              i <= rank && 'bg-pri',
            )}
          />
        ))}
      </span>
      {LEVEL_LABELS[level]}
    </span>
  );
}

export function DifficultyDots({
  difficulty,
  large = false,
  label = `${difficulty}/5`,
}: {
  difficulty: number;
  large?: boolean;
  label?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.75', large && 'gap-2 text-[14px] font-medium')}
    >
      <span className={cn('inline-flex gap-0.5', large && 'gap-0.75')} aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              'size-1.75 border-[1.5px] border-ln2 rounded-full',
              large && 'size-2.25',
              n <= difficulty && 'border-ink bg-ink',
            )}
          />
        ))}
      </span>
      <span aria-hidden>{label}</span>
      <span className="sr-only">Difficulty {difficulty} of 5</span>
    </span>
  );
}

export function SpecialtyTags({
  specialties,
  forAll,
  small = false,
}: {
  specialties: SpecialtyCode[];
  forAll: boolean;
  small?: boolean;
}) {
  if (forAll) {
    return (
      <span className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 h-6 ps-1.75 pe-2.25 rounded-[12px] bg-[color-mix(in_oklch,var(--tag)_16%,var(--sf))] text-ink text-[12px] font-bold',
            'px-2.25 bg-sf2 text-ink3',
            small && 'gap-1.25 h-5.5 ps-1.5 pe-2 rounded-[11px] text-[11.5px] [&>span]:size-1.75',
          )}
        >
          All specialties
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {specialties.map((code) => (
        <span
          key={code}
          title={SPECIALTY_NAMES[code]}
          className={cn(
            'inline-flex items-center gap-1.5 h-6 ps-1.75 pe-2.25 rounded-[12px] bg-[color-mix(in_oklch,var(--tag)_16%,var(--sf))] text-ink text-[12px] font-bold',
            small && 'gap-1.25 h-5.5 ps-1.5 pe-2 rounded-[11px] text-[11.5px] [&>span]:size-1.75',
          )}
          style={{ '--tag': specialtyColor(code) } as CSSProperties}
        >
          <span className="size-2 rounded-full bg-(--tag)" />
          {code}
        </span>
      ))}
    </span>
  );
}

const STATUS: Record<MyCertificationStatus, { label: string; icon: string; tone: string }> = {
  in_progress: { label: 'In progress', icon: 'clock_loader_40', tone: 'bg-pri-sf text-pri' },
  unverified: { label: 'Unverified', icon: 'pending', tone: 'bg-sf2 text-ink2' },
};

export function StatusPill({
  status,
  small = false,
}: {
  status: MyCertificationStatus;
  small?: boolean;
}) {
  const { label, icon, tone } = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1 h-6.5 ps-1.5 pe-2.25 rounded-[13px] text-[12px] font-semibold whitespace-nowrap',
        tone,
        small && 'h-6 ps-1.25 pe-2 rounded-[12px] text-[11.5px]',
      )}
    >
      <Icon name={icon} size={small ? 15 : 16} />
      {label}
    </span>
  );
}

/**
 * The certification's logo from /badges, or a tile with the provider colour and the code when
 * there is no badge file yet (Notes › Badge images).
 */
export function CertBadge({
  code,
  badgeAsset,
  provider,
  size,
  eager = false,
}: {
  code: string;
  badgeAsset: string | null;
  provider: Provider;
  size: number;
  /** Load at once instead of lazily, for the badge at the top of a page. */
  eager?: boolean;
}) {
  if (!badgeAsset) {
    return (
      <span
        className="grid flex-none place-items-center overflow-hidden p-1 border-[1.5px] border-[color-mix(in_oklch,var(--tile)_55%,var(--ln))] rounded-[10px] bg-[color-mix(in_oklch,var(--tile)_14%,var(--sf))] text-ink font-mono font-semibold leading-[1.1] text-center break-all"
        style={
          {
            width: size,
            height: size,
            '--tile': providerColor(provider.hue),
            fontSize: Math.max(9, Math.round(size / 6)),
          } as CSSProperties
        }
        aria-hidden
      >
        {code}
      </span>
    );
  }
  return (
    <Image
      src={`${BADGE_BASE_URL}/${badgeAsset}`}
      alt=""
      width={size}
      height={size}
      className="flex-none object-contain max-w-none"
      style={{ width: size, height: size }}
      loading={eager ? 'eager' : 'lazy'}
      // The optimiser rejects SVG; those files are small and already vector.
      unoptimized={badgeAsset.endsWith('.svg')}
    />
  );
}
