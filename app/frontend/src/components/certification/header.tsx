import type { CertificationDetail } from '@tekcert/types';
import { Icon } from '@tekcert/ui';
import Link from 'next/link';
import {
  CertBadge,
  DifficultyDots,
  LEVEL_LABELS,
  LevelBars,
  ProviderTag,
  SpecialtyTags,
} from '@/components/catalog/parts';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './certification.module.css';
import { examDuration } from './format';

/** Breadcrumb on desktop, back arrow on phones, and the theme toggle. */
export function CertTopBar({ cert }: { cert: CertificationDetail }) {
  return (
    <div className={styles.topBar}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/catalog">Catalog</Link>
        <Icon name="chevron_right" size={16} />
        <Link href={`/catalog?provider=${cert.provider.code}`}>{cert.provider.name}</Link>
        <Icon name="chevron_right" size={16} />
        <span aria-current="page" className={styles.crumbCode}>
          {cert.code}
        </span>
      </nav>
      <Link href="/catalog" className={styles.back} aria-label="Back to catalog">
        <Icon name="arrow_back" size={22} />
      </Link>
      <ThemeToggle />
    </div>
  );
}

/** Provider, level, difficulty, specialties, name, summary and the key exam facts. */
export function CertHeader({ cert }: { cert: CertificationDetail }) {
  const facts: { icon: string; text: string }[] = [
    ...(cert.facts.minutes ? [{ icon: 'timer', text: examDuration(cert.facts.minutes) }] : []),
    ...(cert.facts.questions
      ? [{ icon: 'format_list_numbered', text: `${cert.facts.questions} questions` }]
      : []),
    ...(cert.facts.passingScore
      ? [{ icon: 'flag', text: `${cert.facts.passingScore} required` }]
      : []),
    { icon: 'payments', text: 'Covered by TEK-UP' },
  ];

  return (
    <div className={styles.identity}>
      <div className={styles.identityRow}>
        <ProviderTag provider={cert.provider} />
        <span className={styles.headCode}>{cert.code}</span>
        {cert.examCode && <span className={styles.examCode}>Exam {cert.examCode}</span>}
        <span className={styles.desktopOnly}>
          <LevelBars level={cert.level} large />
        </span>
        <span className={styles.desktopOnly}>
          <DifficultyDots
            difficulty={cert.difficulty}
            large
            label={`Difficulty ${cert.difficulty}/5`}
          />
        </span>
        <span className={styles.mobileOnly}>
          {LEVEL_LABELS[cert.level]} · Difficulty {cert.difficulty}/5
        </span>
        <span className={styles.usefulIn}>
          <span className={styles.usefulLabel}>Useful in</span>
          <SpecialtyTags specialties={cert.specialties} forAll={cert.forAllSpecialties} />
        </span>
      </div>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{cert.name}</h1>
        <span className={styles.desktopOnly}>
          <CertBadge
            code={cert.code}
            badgeAsset={cert.badgeAsset}
            provider={cert.provider}
            size={88}
            eager
          />
        </span>
        <span className={styles.mobileOnly}>
          <CertBadge
            code={cert.code}
            badgeAsset={cert.badgeAsset}
            provider={cert.provider}
            size={56}
            eager
          />
        </span>
      </div>
      <p className={styles.summary}>{cert.summary}</p>
      <ul className={styles.factRowHead}>
        {facts.map((f) => (
          <li key={f.icon}>
            <Icon name={f.icon} size={19} className={styles.muted} />
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
