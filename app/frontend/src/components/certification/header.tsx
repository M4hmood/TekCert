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
import { examDuration } from './format';

/** Breadcrumb on desktop, back arrow on phones, and the theme toggle. */
export function CertTopBar({ cert }: { cert: CertificationDetail }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-ink3 text-[14px] max-md:hidden [&_a]:flex [&_a]:items-center [&_a]:min-h-8 [&_a]:text-ink2 [&_a]:no-underline [&_a:hover]:underline"
      >
        <Link href="/catalog">Catalog</Link>
        <Icon name="chevron_right" size={16} />
        <Link href={`/catalog?provider=${cert.provider.code}`}>{cert.provider.name}</Link>
        <Icon name="chevron_right" size={16} />
        <span aria-current="page" className="text-ink font-mono">
          {cert.code}
        </span>
      </nav>
      <Link
        href="/catalog"
        className="hidden max-md:grid max-md:place-items-center max-md:size-11 max-md:-ms-2.5 max-md:text-ink"
        aria-label="Back to catalog"
      >
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
    <div className="flex flex-col gap-4 min-w-0 max-md:gap-2.5">
      <div className="flex flex-wrap items-center gap-3.5 max-md:gap-2.5 max-md:text-[13px] max-md:text-ink2">
        <ProviderTag provider={cert.provider} />
        <span className="text-ink3 type-code">{cert.code}</span>
        {cert.examCode && (
          <span className="text-ink3 text-[13px] max-md:hidden">Exam {cert.examCode}</span>
        )}
        <span className="contents max-md:hidden">
          <LevelBars level={cert.level} large />
        </span>
        <span className="contents max-md:hidden">
          <DifficultyDots
            difficulty={cert.difficulty}
            large
            label={`Difficulty ${cert.difficulty}/5`}
          />
        </span>
        <span className="hidden max-md:inline">
          {LEVEL_LABELS[cert.level]} · Difficulty {cert.difficulty}/5
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5 max-md:basis-full">
          <span className="text-ink3 text-[13px] max-md:hidden">Useful in</span>
          <SpecialtyTags specialties={cert.specialties} forAll={cert.forAllSpecialties} />
        </span>
      </div>
      <div className="flex items-start justify-between gap-6">
        <h1 className="font-serif text-[52px] font-medium tracking-[-0.02em] leading-[1.05] max-md:text-[30px] max-md:leading-[1.12]">
          {cert.name}
        </h1>
        <span className="contents max-md:hidden">
          <CertBadge
            code={cert.code}
            badgeAsset={cert.badgeAsset}
            provider={cert.provider}
            size={88}
            eager
          />
        </span>
        <span className="hidden max-md:inline">
          <CertBadge
            code={cert.code}
            badgeAsset={cert.badgeAsset}
            provider={cert.provider}
            size={56}
            eager
          />
        </span>
      </div>
      <p className="max-w-170 text-ink2 text-[16.5px] leading-[1.6] max-md:hidden">
        {cert.summary}
      </p>
      <ul className="flex flex-wrap gap-x-7 gap-y-2 pt-1 pb-0.5 text-ink2 text-[14px] max-md:hidden [&_li]:flex [&_li]:items-center [&_li]:gap-1.75">
        {facts.map((f) => (
          <li key={f.icon}>
            <Icon name={f.icon} size={19} className="text-ink3" />
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
