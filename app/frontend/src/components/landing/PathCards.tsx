import { countLabel, type SpecialtyCode } from '@tekcert/types';
import { cn, Icon } from '@tekcert/ui';
import type { CSSProperties } from 'react';
import { specialtyColor } from '@/components/catalog/parts';

/** One path as the landing page's public stats describe it. */
export interface LandingPath {
  code: string;
  name: string;
  certifications: number;
  students: number;
  /** The certifications in path order: the start of it is drawn. */
  track: readonly string[];
}

/** How many steps of a specialty path the card draws before "+N more". */
const STEPS = 3;

const CARD =
  'relative flex flex-col overflow-hidden border border-ln rounded-[16px] transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1';

/**
 * A specialty's path (design/Landing, "One path per specialty"): its colour as a stripe and a
 * glow, the code and the name, then the first certifications drawn as a track of steps, and who
 * follows it.
 */
export function SpecialtyPathCard({ path }: { path: LandingPath }) {
  const steps = path.track.slice(0, STEPS);
  const more = path.certifications - steps.length;
  return (
    <li
      className={cn(
        CARD,
        'gap-4 pt-6 px-5.5 pb-4.5 bg-sf bg-[image:radial-gradient(120%_70%_at_100%_0%,color-mix(in_oklch,var(--spec)_16%,transparent),transparent_65%)] hover:border-[color-mix(in_oklch,var(--spec)_45%,var(--ln))] hover:shadow-[0_20px_36px_-22px_color-mix(in_oklch,var(--spec)_60%,transparent)]',
      )}
      style={{ '--spec': specialtyColor(path.code as SpecialtyCode) } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-(--spec)" />

      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-[30px] font-semibold leading-none tracking-[-0.01em]">
          {path.code}
        </h3>
        <p className="min-h-10 text-ink2 text-[14px] leading-[1.4] max-md:min-h-0">{path.name}</p>
      </div>

      {/* The path itself: a line through the steps, the first one filled. */}
      <ol
        aria-label={`First certifications of the ${path.code} path`}
        className="relative flex flex-col gap-2.5 ps-6 before:absolute before:start-[5px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[color-mix(in_oklch,var(--spec)_35%,transparent)]"
      >
        {steps.map((code, i) => (
          <li key={code} className="relative font-mono text-[13.5px] font-semibold leading-5">
            <span
              aria-hidden
              className={cn(
                'absolute -start-6 top-1 size-3 rounded-full border-2 border-(--spec)',
                i === 0 ? 'bg-(--spec)' : 'bg-sf',
              )}
            />
            {code}
          </li>
        ))}
        {more > 0 && (
          <li className="relative text-ink3 text-[13px] leading-5">
            <span
              aria-hidden
              className="absolute -start-[22px] top-1.5 size-2 rounded-full bg-[color-mix(in_oklch,var(--spec)_45%,var(--ln2))]"
            />
            +{more} more
          </li>
        )}
      </ol>

      <div className="flex items-center justify-between gap-3 mt-auto pt-3.5 border-t border-ln text-ink2 text-[13px]">
        <span className="flex items-center gap-1.5">
          <Icon name="group" size={17} className="text-ink3" />
          <span>
            <strong className="text-ink">{path.students.toLocaleString('en-US')}</strong> following
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="workspace_premium" size={17} className="text-ink3" />
          {countLabel(path.certifications, 'cert')}
        </span>
      </div>
    </li>
  );
}

/** The shared path for ING-1 to ING-3 and anyone undecided, on the navy panel, two columns wide. */
export function FundamentalsPathCard({ path, length }: { path: LandingPath; length: number }) {
  return (
    <li
      className={cn(
        CARD,
        'col-span-2 gap-4 p-7 border-transparent bg-hero text-hero-ink bg-[image:radial-gradient(90%_120%_at_100%_0%,rgb(226_188_102/0.18),transparent_60%)] hover:shadow-[0_24px_44px_-24px_rgb(20_36_75/0.7)] max-md:col-span-1 max-md:p-5',
      )}
    >
      <div className="flex items-center justify-between gap-3 max-md:flex-col max-md:items-start max-md:gap-1.5">
        <span className="text-[12px] font-semibold tracking-[0.1em] uppercase opacity-80">
          Shared path · ING-1 to ING-5
        </span>
        <span className="flex flex-none items-center gap-1.5 text-[13px] opacity-80">
          <Icon name="workspace_premium" size={17} />
          {countLabel(path.certifications, 'certification')}
        </span>
      </div>
      <h3 className="font-serif text-[36px] font-medium leading-none max-md:text-[28px]">
        {path.name}
      </h3>
      <p className="max-w-110 text-[14.5px] leading-[1.55] opacity-90">
        The starting point if you haven’t chosen your specialty yet: the foundational
        certifications of the major providers.
      </p>
      <ul aria-label="Certifications of the Fundamentals" className="flex flex-wrap gap-2 mt-auto">
        {path.track.slice(0, length).map((code) => (
          <li
            key={code}
            className="px-3 py-1.5 border border-white/15 rounded-full bg-white/8 font-mono text-[12.5px] font-semibold"
          >
            {code}
          </li>
        ))}
      </ul>
    </li>
  );
}
