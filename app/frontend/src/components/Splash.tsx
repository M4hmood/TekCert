'use client';

import Image from 'next/image';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { markSplashSeen } from '@/lib/preferences';

/** One tick per certification in the funded catalog at launch. */
const TICKS = 56;
/** When the last tick lights, just before the crest lands. */
const RING_MS = 1000;

/** Ticks light slowly at first and race towards the end, winding up to the strike. */
const tickDelay = (index: number) => Math.round((index / (TICKS - 1)) ** 0.62 * RING_MS);

/**
 * The first screen of a browser session: a ring of ticks fills up like the progress ring, the
 * crest is struck into the middle, then the seal opens onto the app. It only covers the page
 * visually: the app loads underneath and clicks pass through, so it never makes anyone wait.
 */
export function Splash() {
  const [done, setDone] = useState(false);
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markSplashSeen();
    // Not onAnimationEnd: on a slow load the animation can end before this code has run, while
    // `finished` still resolves. No animation (reduced motion) or a cancelled one also ends it.
    const finished = backdrop.current?.getAnimations()[0]?.finished ?? Promise.resolve();
    void finished.catch(() => undefined).then(() => setDone(true));
  }, []);

  if (done) return null;

  return (
    <div
      ref={backdrop}
      data-splash
      aria-hidden
      className="splash-backdrop fixed inset-0 z-1000 grid place-items-center overflow-hidden pointer-events-none animate-splash-open [--exit:1950ms] [--impact:1070ms] [--opening:560ms] motion-reduce:hidden"
    >
      <div className="relative w-[min(72vmin,420px)] aspect-square animate-splash-stage">
        <span className="splash-bloom absolute -inset-[30%] opacity-0 animate-splash-bloom" />
        <svg
          className="absolute inset-0 overflow-visible animate-splash-kick"
          viewBox="-100 -100 200 200"
        >
          {Array.from({ length: TICKS }, (_, index) => (
            <line
              key={index}
              className="stroke-hero-ink/20 [stroke-width:1.5] [stroke-linecap:round] animate-splash-ignite"
              x1="0"
              y1="-84"
              x2="0"
              y2="-96"
              transform={`rotate(${((index * 360) / TICKS).toFixed(3)})`}
              style={{ animationDelay: `${tickDelay(index)}ms` } as CSSProperties}
            />
          ))}
        </svg>
        <span className="absolute inset-[21%] rounded-full border-2 border-gold-fill opacity-0 animate-splash-ripple" />
        <span className="absolute inset-[21%] opacity-0 animate-splash-strike">
          {/* Unoptimised: the glint masks this same file, so the browser loads it once. */}
          <Image
            src="/icons/tekcert.png"
            alt=""
            fill
            sizes="280px"
            preload
            unoptimized
            className="object-contain"
          />
          <span className="splash-glint absolute inset-0 animate-splash-sweep" />
        </span>
      </div>
    </div>
  );
}
