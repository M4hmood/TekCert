'use client';

import Image from 'next/image';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { markSplashSeen } from '@/lib/preferences';

/** One tick per certification in the funded catalog at launch. */
export const TICKS = 56;
/** When the last tick lights and the gold arc starts to close the ring. */
export const RING_MS = 1000;
/** The crest lands just after the ring is full. */
const IMPACT_MS = 1070;
/** The stage fades and the backdrop opens; it is fully open OPENING_MS later. */
const EXIT_MS = 1450;
const OPENING_MS = 560;

/** Ticks light slowly at first and race towards the end, winding up to the strike. */
export const tickDelay = (index: number) => Math.round((index / (TICKS - 1)) ** 0.62 * RING_MS);

/**
 * The first screen of a browser session, in three beats: a ring of ticks fills like a gauge,
 * the crest is struck into the middle as the last tick and a thin arc close the ring in gold,
 * then the backdrop opens onto the app. It only covers the page visually: the app loads
 * underneath and clicks pass through, so it never makes anyone wait.
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
      className="splash-backdrop fixed inset-0 z-1000 grid place-items-center overflow-hidden pointer-events-none animate-splash-open motion-reduce:hidden"
      style={
        {
          '--ring': `${RING_MS}ms`,
          '--impact': `${IMPACT_MS}ms`,
          '--exit': `${EXIT_MS}ms`,
          '--opening': `${OPENING_MS}ms`,
        } as CSSProperties
      }
    >
      <div className="relative w-[min(72vmin,420px)] aspect-square animate-splash-stage">
        <svg
          className="absolute inset-0 overflow-visible animate-splash-kick"
          viewBox="-100 -100 200 200"
        >
          <circle
            data-ring-track
            r="90"
            className="fill-none stroke-hero-ink/12 [stroke-width:1]"
          />
          {Array.from({ length: TICKS }, (_, index) => (
            <line
              key={index}
              data-ring-tick
              className={`stroke-hero-ink/20 [stroke-width:1.5] [stroke-linecap:round] ${
                index === TICKS - 1 ? 'animate-splash-ignite-last' : 'animate-splash-ignite'
              }`}
              x1="0"
              y1="-84"
              x2="0"
              y2="-96"
              transform={`rotate(${((index * 360) / TICKS).toFixed(3)})`}
              style={{ animationDelay: `${tickDelay(index)}ms` } as CSSProperties}
            />
          ))}
          {/* Drawn from 12 o'clock, clockwise: the dash is hidden by its own offset until the ring is full. */}
          <circle
            data-ring-close
            r="90"
            pathLength={1}
            transform="rotate(-90)"
            className="fill-none stroke-gold-fill [stroke-width:1] [stroke-dasharray:1] [stroke-dashoffset:1] animate-splash-close"
          />
        </svg>
        <span className="absolute inset-[21%] rounded-full border-2 border-gold-fill opacity-0 animate-splash-ripple" />
        <span className="absolute inset-[21%] opacity-0 animate-splash-strike">
          {/* Unoptimised: the glint masks this same file, so the browser loads it once. */}
          <Image
            src="/icons/tekcert-512.webp"
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
