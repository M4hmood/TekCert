import {
  barWidth,
  type CertificationSummary,
  countLabel,
  LANDING_TRACK_LENGTH,
  type PublicStats,
  type SpecialtyCode,
} from '@tekcert/types';
import { Icon } from '@tekcert/ui';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { CertBadge, specialtyColor } from '@/components/catalog/parts';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  groupByProvider,
  maxPreparing,
  semesterLabel,
  SHOWCASE_BADGES,
  SHOWCASE_ROWS,
  trackLine,
} from './format';
import { ProviderRail } from './ProviderRail';

export interface LandingPageProps {
  /** Null when the API couldn't be reached: the page still explains TekCert, without numbers. */
  stats: PublicStats | null;
  catalog: CertificationSummary[] | null;
  /** ISO time of the render, for the semester label. */
  now: string;
}

const SECTION = 'px-18 max-lg:px-8 max-md:px-4';
const H2 =
  'font-serif text-[48px] font-medium tracking-[-0.02em] leading-[1.1] max-lg:text-[38px] max-md:text-[28px] max-md:leading-[1.15]';
const OVERLINE = 'text-[12.5px] font-semibold tracking-[0.12em] uppercase';
const NAV = [
  { href: '#certifications', label: 'Certifications' },
  { href: '#how', label: 'How it works' },
  { href: '#paths', label: 'Paths' },
  { href: '#help', label: 'Find help' },
];
const STEPS = [
  {
    numeral: 'I.',
    title: 'Tell us your specialty',
    text: 'In ING-4 and ING-5 you follow your specialty’s path. From ING-1 to ING-3, pick the specialty you’re aiming for or start with the Fundamentals.',
  },
  {
    numeral: 'II.',
    title: 'Go chapter by chapter',
    text: 'Tick off the official syllabus as you revise, follow the recommended resources and earn points for every chapter you finish.',
  },
  {
    numeral: 'III.',
    title: 'Find who can help',
    text: 'Each certification page lists the classmates who hold it and those preparing it, so you know who to write to.',
  },
];

/**
 * The public page at "/" (design/Landing). Everything a visitor sees is either copy or a
 * total: no student is named here, since profiles are for signed-in students only.
 */
export function LandingPage({ stats, catalog, now }: LandingPageProps) {
  const providers = catalog ? groupByProvider(catalog) : [];
  return (
    <div className="flex flex-col min-h-dvh bg-bg text-ink">
      <a
        href="#main"
        className="absolute top-2 start-2 z-20 px-3.5 py-2.5 rounded-field bg-pri text-pri-ink font-semibold -translate-y-[200%] focus:translate-y-0"
      >
        Skip to content
      </a>
      <header
        className={`flex items-center justify-between gap-4 py-5 border-b border-ln max-md:py-3 ${SECTION}`}
      >
        <Link
          href="/"
          aria-label="TekCert home"
          className="flex items-center gap-2.75 text-ink no-underline"
        >
          <Image
            src="/icons/tekcert-96.png"
            alt=""
            width={36}
            height={36}
            className="flex-none size-9 object-contain"
            priority
          />
          <span className="font-serif text-[23px] font-semibold tracking-[-0.01em]">TekCert</span>
          <span className="ms-0.5 ps-2.75 border-s border-ln2 text-ink3 text-[11px] font-semibold tracking-[0.12em] max-md:hidden">
            TEK-UP
          </span>
        </Link>
        <nav aria-label="Sections" className="flex gap-1 max-lg:hidden">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center h-11 px-3.5 rounded-field text-ink2 text-[15px] font-medium no-underline hover:bg-sf2 hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="flex items-center h-11 px-4 rounded-field text-pri text-[15px] font-semibold no-underline hover:bg-pri-sf"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center h-11 px-4.5 rounded-field bg-pri text-pri-ink text-[15px] font-semibold no-underline max-md:hidden"
          >
            Create my account
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-col">
        <section
          aria-labelledby="landing-title"
          className={`grid grid-cols-[1.15fr_1fr] items-center gap-18 pt-22 pb-20 max-xl:gap-10 max-lg:grid-cols-1 max-lg:pt-14 max-lg:pb-14 max-md:gap-7 max-md:pt-8 max-md:pb-10 ${SECTION}`}
        >
          <div className="flex flex-col gap-7 max-md:gap-5">
            <span className={`${OVERLINE} text-gold`}>For TEK-UP students only</span>
            <h1
              id="landing-title"
              className="font-serif text-[72px] font-medium tracking-[-0.025em] leading-[1.02] text-balance max-xl:text-[60px] max-md:text-[40px] max-md:leading-[1.05]"
            >
              Earn the IT certifications that count.{' '}
              <span className="italic">Your classmates are already taking them.</span>
            </h1>
            <p className="max-w-145 text-ink2 text-[19px] leading-[1.6] text-pretty max-md:text-[16px]">
              AWS, Microsoft Azure, Red Hat, Cisco, the Linux Foundation: TekCert brings together
              the certifications the institute funds, suggests the path for your specialty and shows
              you who in your class is preparing the same one.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Link
                href="/sign-up"
                className="flex items-center gap-2.5 h-13 px-6 rounded-[10px] bg-pri text-pri-ink text-[16px] font-semibold no-underline max-md:flex-1 max-md:justify-center max-md:px-4"
              >
                <Icon name="school" size={21} />
                <span className="max-md:hidden">Sign up with my @tek-up.de email</span>
                <span className="hidden max-md:inline">Sign up with @tek-up.de</span>
              </Link>
              <a
                href="#paths"
                className="flex items-center h-13 px-5 border-[1.5px] border-ln2 rounded-[10px] text-ink text-[16px] font-semibold no-underline hover:bg-sf max-md:hidden"
              >
                See the paths
              </a>
            </div>
            <span className="flex items-center gap-2 text-ink3 text-[14px]">
              <Icon name="lock" size={18} />
              Access limited to institute addresses. No payment, ever.
            </span>
          </div>
          {stats && <StatsPanel stats={stats} now={new Date(now)} />}
        </section>

        <section
          id="certifications"
          aria-labelledby="landing-certifications"
          className="flex flex-col gap-8 pt-20 pb-18 border-y border-ln bg-sf scroll-mt-4 max-md:gap-5 max-md:py-10"
        >
          <ProviderRail
            heading={
              <div className="flex flex-col gap-3 max-w-160">
                {stats && (
                  <span className={`${OVERLINE} text-ink3`}>
                    {countLabel(stats.certifications, 'certification')} ·{' '}
                    {countLabel(stats.providers, 'provider')}
                  </span>
                )}
                <h2 id="landing-certifications" className={H2}>
                  Certifications funded by the institute
                </h2>
              </div>
            }
          >
            {providers.map(({ provider, certifications }) => (
              <article
                key={provider.code}
                aria-label={provider.name}
                className="flex flex-none flex-col w-90 border border-ln rounded-[16px] bg-bg overflow-hidden snap-start max-md:w-70"
              >
                <div className="flex flex-wrap content-center items-center gap-3 min-h-36 p-6 border-b border-ln bg-sf2 max-md:min-h-28 max-md:p-4">
                  {certifications.slice(0, SHOWCASE_BADGES).map((cert) => (
                    <CertBadge
                      key={cert.slug}
                      code={cert.code}
                      badgeAsset={cert.badgeAsset}
                      provider={cert.provider}
                      size={64}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-3 pt-4.5 px-6 pb-5.5 max-md:px-4 max-md:pb-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-[22px] font-semibold">{provider.name}</h3>
                    <span className="flex-none text-ink3 text-[13px]">
                      {countLabel(certifications.length, 'certification')}
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {certifications.slice(0, SHOWCASE_ROWS).map((cert) => (
                      <li
                        key={cert.slug}
                        className="grid grid-cols-[92px_minmax(0,1fr)] items-baseline gap-2.5 py-1.75 border-t border-ln text-[14px]"
                      >
                        <span className="font-mono text-[12.5px] font-medium truncate">
                          {cert.code}
                        </span>
                        <span className="text-ink2">{cert.name}</span>
                      </li>
                    ))}
                    {certifications.length > SHOWCASE_ROWS && (
                      <li className="py-1.75 border-t border-ln text-ink3 text-[13.5px]">
                        and {certifications.length - SHOWCASE_ROWS} more
                      </li>
                    )}
                  </ul>
                </div>
              </article>
            ))}
            {!catalog && (
              <p role="status" className="py-6 text-ink2 text-[15px]">
                The catalog can’t be shown right now. Sign in to browse it.
              </p>
            )}
          </ProviderRail>
          <div className={SECTION}>
            <Link
              href="/catalog"
              className="flex items-center gap-1.5 w-fit min-h-11 text-[15px] font-semibold"
            >
              Full catalog
              <Icon name="arrow_forward" size={20} />
            </Link>
          </div>
        </section>

        <section
          id="how"
          aria-labelledby="landing-how"
          className={`flex flex-col gap-12 py-24 scroll-mt-4 max-md:gap-7 max-md:py-12 ${SECTION}`}
        >
          <div className="flex items-end justify-between gap-12 max-lg:flex-col max-lg:items-start max-lg:gap-4">
            <h2 id="landing-how" className={`${H2} max-w-160`}>
              Three steps between you and your next certification.
            </h2>
            <p className="max-w-100 text-ink2 text-[16px] leading-[1.6]">
              Courses stay on the official platforms. TekCert guides you, tracks your progress and
              shows you who can help.
            </p>
          </div>
          <ol className="grid grid-cols-3 border-t-[1.5px] border-ink max-md:grid-cols-1">
            {STEPS.map((step) => (
              <li
                key={step.numeral}
                className="flex flex-col gap-3.5 pt-7 px-8 border-s border-ln first:ps-0 first:border-s-0 last:pe-0 max-md:px-0 max-md:pb-6 max-md:border-s-0 max-md:border-b max-md:last:border-b-0"
              >
                <span
                  aria-hidden
                  className="font-serif text-[56px] leading-none text-gold max-md:text-[40px]"
                >
                  {step.numeral}
                </span>
                <h3 className="font-serif text-[26px] font-semibold leading-[1.2] max-md:text-[22px]">
                  {step.title}
                </h3>
                <p className="text-ink2 text-[15.5px] leading-[1.6]">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {stats && <Paths stats={stats} />}

        <section
          id="help"
          aria-labelledby="landing-help"
          className={`grid grid-cols-2 items-center gap-18 py-24 scroll-mt-4 max-lg:grid-cols-1 max-lg:gap-8 max-md:py-12 ${SECTION}`}
        >
          <div className="flex flex-col gap-5">
            <h2 id="landing-help" className={H2}>
              Got a question? Someone in your class has already taken it.
            </h2>
            <p className="max-w-130 text-ink2 text-[17px] leading-[1.6] max-md:text-[15.5px]">
              Each certification page lists the students who hold it and those preparing it. Their
              profile shows their institute email, so you know who to write to. Only signed-in
              students see each other.
            </p>
          </div>
          <div
            aria-hidden
            className="flex flex-col gap-1.5 p-6 border border-ln rounded-[16px] bg-sf max-md:p-4"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-[15px] font-semibold">Who to ask</span>
              <span className="text-ink3 text-[13px]">in your class</span>
            </div>
            <HelpRow
              icon="workspace_premium"
              tone="bg-gold-sf text-gold"
              title="A classmate who holds it"
              meta="Knows what the exam asks"
            />
            <HelpRow
              icon="menu_book"
              tone="bg-pri-sf text-pri"
              title="Classmates preparing it"
              meta="At the same chapters as you"
            />
            <HelpRow
              icon="volunteer_activism"
              tone="bg-ok-sf text-ok"
              title="Students available to help"
              meta="They said you can write to them"
            />
          </div>
        </section>

        <section
          aria-labelledby="landing-join"
          className="flex items-center justify-between gap-12 mx-18 mb-18 p-18 rounded-[20px] bg-hero text-hero-ink max-lg:flex-col max-lg:items-start max-lg:mx-8 max-lg:p-10 max-md:gap-6 max-md:mx-4 max-md:mb-10 max-md:p-6"
        >
          <div className="flex flex-col gap-3.5">
            <h2
              id="landing-join"
              className="font-serif text-[52px] font-medium tracking-[-0.02em] leading-[1.05] max-lg:text-[40px] max-md:text-[30px]"
            >
              Your next certification
              <br />
              <span className="italic text-[#e2bc66]">is waiting for you this semester.</span>
            </h2>
            <p className="text-[17px] opacity-85 max-md:text-[15.5px]">
              Two minutes to create your account. Your path is ready right after.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="flex flex-none items-center gap-2.5 h-14 px-7 rounded-[10px] bg-[#d4a23a] text-[#1a1406] text-[16.5px] font-semibold no-underline max-md:w-full max-md:justify-center"
          >
            Create my account
            <Icon name="arrow_forward" size={21} />
          </Link>
        </section>
      </main>

      <footer
        className={`flex flex-wrap justify-between gap-x-6 gap-y-2 py-7 border-t border-ln text-ink3 text-[13.5px] ${SECTION}`}
      >
        <span>TekCert · TEK-UP community platform</span>
        <span>Exams are funded by the institute. Nothing is sold on TekCert.</span>
      </footer>
    </div>
  );
}

/** The numbers beside the hero: three totals and the students preparing, by specialty. */
function StatsPanel({ stats, now }: { stats: PublicStats; now: Date }) {
  const longest = maxPreparing(stats);
  return (
    <section
      aria-label="TekCert in numbers"
      className="flex flex-col gap-7 p-8 border border-ln rounded-[18px] bg-sf shadow-[0_24px_60px_-32px_rgba(19,26,44,.35)] max-md:gap-5 max-md:p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-ink3 text-[12.5px] font-semibold tracking-[0.1em] uppercase">
          {semesterLabel(now)}
        </span>
        <span className="inline-flex items-center gap-1.75 text-ok text-[13px] font-semibold">
          <span
            aria-hidden
            className="size-2 rounded-full bg-ok animate-pulse motion-reduce:animate-none"
          />
          Live
        </span>
      </div>
      <dl className="grid grid-cols-[1.3fr_1fr_1fr] gap-5 pb-6 border-b border-ln max-md:grid-cols-2">
        <Stat value={stats.preparing} label="students preparing a certification" lead />
        <Stat value={stats.students} label="students on TekCert" />
        <Stat value={stats.certifications} label="certifications in the catalog" />
      </dl>
      <div className="flex flex-col gap-2.5">
        <h2 className="text-ink2 text-[13px] font-semibold">Preparing by specialty</h2>
        <ul className="grid grid-cols-[72px_1fr_32px] items-center gap-x-3.5 gap-y-2.5 text-[13.5px]">
          {stats.bySpecialty.map((specialty) => (
            <li key={specialty.code} className="contents" title={specialty.name}>
              <span className="flex items-center gap-1.75 font-semibold">
                <span
                  aria-hidden
                  className="flex-none size-2 rounded-full"
                  style={{ background: specialtyColor(specialty.code as SpecialtyCode) }}
                />
                {specialty.code}
              </span>
              <span aria-hidden className="h-2 rounded-[4px] bg-sf2">
                <span
                  className="block h-full rounded-[4px]"
                  style={{
                    width: `${barWidth(specialty.preparing, longest)}%`,
                    background: specialtyColor(specialty.code as SpecialtyCode),
                  }}
                />
              </span>
              <span className="font-semibold text-end">
                {specialty.preparing}
                <span className="sr-only"> students preparing in {specialty.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ value, label, lead = false }: { value: number; label: string; lead?: boolean }) {
  return (
    <div className={`flex flex-col-reverse gap-1 ${lead ? 'max-md:col-span-2' : ''}`}>
      <dt className="text-ink2 text-[14px] leading-[1.4]">{label}</dt>
      <dd
        className={
          lead
            ? 'font-serif text-[64px] font-medium tracking-[-0.03em] leading-none text-gold max-md:text-[52px]'
            : 'font-serif text-[40px] font-medium leading-[1.15] max-md:text-[30px]'
        }
      >
        {value.toLocaleString('en-US')}
      </dd>
    </div>
  );
}

/** One path per specialty, the shared Fundamentals path first and twice as wide. */
function Paths({ stats }: { stats: PublicStats }) {
  return (
    <section
      id="paths"
      aria-labelledby="landing-paths"
      className={`flex flex-col gap-10 py-22 border-y border-ln bg-sf scroll-mt-4 max-md:gap-6 max-md:py-12 ${SECTION}`}
    >
      <div className="flex items-end justify-between gap-6 max-md:flex-col max-md:items-start max-md:gap-2">
        <h2 id="landing-paths" className={H2}>
          One path per specialty, plus the Fundamentals
        </h2>
        <Link
          href="/paths"
          className="flex flex-none items-center gap-1.5 min-h-11 text-[15px] font-semibold"
        >
          All paths
          <Icon name="arrow_forward" size={20} />
        </Link>
      </div>
      <ul className="grid grid-cols-4 gap-5 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 max-md:gap-3">
        {stats.paths.map((path) =>
          path.hue === null ? (
            <li
              key={path.code}
              className="flex flex-col col-span-2 gap-4 p-7 border border-ln rounded-[16px] bg-hero text-hero-ink max-md:col-span-1 max-md:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold tracking-[0.1em] uppercase opacity-80">
                  Shared path · ING-1 to ING-5
                </span>
                <span className="flex-none text-[13px] opacity-80">
                  {countLabel(path.certifications, 'certification')}
                </span>
              </div>
              <h3 className="font-serif text-[34px] font-medium max-md:text-[28px]">{path.name}</h3>
              <p className="max-w-110 text-[14.5px] leading-[1.55] opacity-90">
                The starting point if you haven’t chosen your specialty yet: the foundational
                certifications of the major providers.
              </p>
              <span className="mt-auto font-mono text-[12px] font-medium opacity-90">
                {trackLine(path.track, LANDING_TRACK_LENGTH + 2, ' · ')}
              </span>
            </li>
          ) : (
            <li
              key={path.code}
              className="flex flex-col gap-3 p-5.5 border border-ln rounded-[16px] bg-bg"
              style={{ '--spec': specialtyColor(path.code as SpecialtyCode) } as CSSProperties}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2.25 font-serif text-[26px] font-semibold">
                  <span aria-hidden className="flex-none size-3 rounded-full bg-(--spec)" />
                  {path.code}
                </h3>
                <span className="flex-none text-ink3 text-[12.5px]">
                  {countLabel(path.certifications, 'cert')}
                </span>
              </div>
              <p className="min-h-10 text-ink2 text-[14px] leading-[1.4] max-md:min-h-0">
                {path.name}
              </p>
              <span className="font-mono text-[11.5px] font-medium text-ink2">
                {trackLine(path.track, LANDING_TRACK_LENGTH)}
              </span>
              <span className="mt-auto pt-3 border-t border-ln text-ink2 text-[13px]">
                <strong className="text-ink">{path.students.toLocaleString('en-US')}</strong>{' '}
                {path.students === 1 ? 'student follows it' : 'students follow it'}
              </span>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function HelpRow({
  icon,
  tone,
  title,
  meta,
}: {
  icon: string;
  tone: string;
  title: string;
  meta: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-ln">
      <span className={`grid flex-none place-items-center size-10 rounded-full ${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{title}</span>
        <span className="text-ink3 text-[13px]">{meta}</span>
      </span>
    </div>
  );
}
