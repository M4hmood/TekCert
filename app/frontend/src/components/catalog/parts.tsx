import type {
  CertificationLevel,
  MyCertificationStatus,
  Provider,
  SpecialtyCode,
} from '@tekcert/types';
import { CERTIFICATION_LEVELS } from '@tekcert/types';
import { cx, Icon } from '@tekcert/ui';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import styles from './parts.module.css';

/** Small pieces shared by the catalog cards and the certification page. */

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
    <span className={styles.providerTag}>
      <span className={styles.providerDot} style={{ background: providerColor(provider.hue) }} />
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
    <span className={cx(styles.level, large && styles.large)}>
      <span className={styles.bars} aria-hidden>
        {CERTIFICATION_LEVELS.map((l, i) => (
          <span key={l} className={cx(styles.bar, i <= rank && styles.barOn)} />
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
    <span className={cx(styles.difficulty, large && styles.large)}>
      <span className={styles.dots} aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cx(styles.dot, n <= difficulty && styles.dotOn)} />
        ))}
      </span>
      <span aria-hidden>{label}</span>
      <span className="visually-hidden">Difficulty {difficulty} of 5</span>
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
      <span className={styles.tags}>
        <span className={cx(styles.tag, styles.tagAll, small && styles.tagSmall)}>
          All specialties
        </span>
      </span>
    );
  }
  return (
    <span className={styles.tags}>
      {specialties.map((code) => (
        <span
          key={code}
          title={SPECIALTY_NAMES[code]}
          className={cx(styles.tag, small && styles.tagSmall)}
          style={{ '--tag': specialtyColor(code) } as CSSProperties}
        >
          <span className={styles.tagDot} />
          {code}
        </span>
      ))}
    </span>
  );
}

const STATUS: Record<MyCertificationStatus, { label: string; icon: string }> = {
  in_progress: { label: 'In progress', icon: 'clock_loader_40' },
  unverified: { label: 'Unverified', icon: 'pending' },
};

export function StatusPill({
  status,
  small = false,
}: {
  status: MyCertificationStatus;
  small?: boolean;
}) {
  const { label, icon } = STATUS[status];
  return (
    <span className={cx(styles.pill, styles[status], small && styles.pillSmall)}>
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
        className={styles.badgeTile}
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
      className={styles.badgeImage}
      loading={eager ? 'eager' : 'lazy'}
      // The optimiser rejects SVG; those files are small and already vector.
      unoptimized={badgeAsset.endsWith('.svg')}
    />
  );
}
