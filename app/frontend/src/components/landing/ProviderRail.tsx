'use client';

import { Icon } from '@tekcert/ui';
import { type ReactNode, useRef } from 'react';

/** How far one press of an arrow moves the rail: a card and its gap. */
const STEP = 380;

/**
 * The horizontal list of providers with its two arrows (design/Landing). It scrolls with a
 * swipe, a trackpad or the keyboard as well: the arrows are a convenience.
 */
export function ProviderRail({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: 1 | -1) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.current?.scrollBy({ left: direction * STEP, behavior: reduced ? 'auto' : 'smooth' });
  };
  const arrow =
    'grid flex-none place-items-center size-11 border-[1.5px] border-ln2 rounded-full bg-bg text-ink cursor-pointer hover:border-ink';
  return (
    <>
      <div className="flex items-end justify-between gap-12 px-18 max-lg:px-8 max-md:px-4">
        {heading}
        <div className="flex flex-none items-center gap-2.5 max-md:hidden">
          <button
            type="button"
            aria-label="Previous providers"
            className={arrow}
            onClick={() => move(-1)}
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <button
            type="button"
            aria-label="Next providers"
            className={arrow}
            onClick={() => move(1)}
          >
            <Icon name="arrow_forward" size={20} />
          </button>
        </div>
      </div>
      <div
        ref={rail}
        role="region"
        aria-label="Funded certifications by provider"
        tabIndex={0}
        className="flex gap-5 px-18 pb-2 overflow-x-auto snap-x snap-mandatory scroll-px-18 [scrollbar-width:none] max-lg:px-8 max-lg:scroll-px-8 max-md:gap-3 max-md:px-4 max-md:scroll-px-4"
      >
        {children}
      </div>
    </>
  );
}
