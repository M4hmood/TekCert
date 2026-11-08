'use client';

import Image from 'next/image';
import { type AnimationEvent, type CSSProperties, useEffect, useState } from 'react';
import { markSplashSeen } from '@/lib/preferences';
import styles from './Splash.module.css';

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

  useEffect(markSplashSeen, []);

  if (done) return null;

  const finish = (event: AnimationEvent) => {
    // Only the backdrop's own animation, not the ones bubbling up from the seal.
    if (event.target === event.currentTarget) setDone(true);
  };

  return (
    <div data-splash aria-hidden className={styles.splash} onAnimationEnd={finish}>
      <div className={styles.stage}>
        <span className={styles.bloom} />
        <svg className={styles.ring} viewBox="-100 -100 200 200">
          {Array.from({ length: TICKS }, (_, index) => (
            <line
              key={index}
              className={styles.tick}
              x1="0"
              y1="-84"
              x2="0"
              y2="-96"
              transform={`rotate(${((index * 360) / TICKS).toFixed(3)})`}
              style={{ animationDelay: `${tickDelay(index)}ms` } as CSSProperties}
            />
          ))}
        </svg>
        <span className={styles.ripple} />
        <span className={styles.crest}>
          {/* Unoptimised: the glint masks this same file, so the browser loads it once. */}
          <Image src="/icons/tekcert.png" alt="" fill sizes="280px" preload unoptimized />
          <span className={styles.glint} />
        </span>
      </div>
    </div>
  );
}
