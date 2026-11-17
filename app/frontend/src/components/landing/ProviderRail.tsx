'use client';

import { cn, Icon } from '@tekcert/ui';
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/** How long each card stays at the start of the rail before the carousel moves on. */
export const AUTOPLAY_MS = 3200;

/** Below this, a press-and-move of the mouse is a click, not a drag. */
const DRAG_THRESHOLD = 4;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The carousel of providers (design/Landing). It moves one card at a time with the arrows, the
 * dots, the keyboard (← →), a swipe, a trackpad or by dragging with the mouse, and always comes
 * to rest on a card. The counter and the dots follow the card at the start of the rail; the
 * edges fade where there is more to see.
 *
 * It also moves on by itself every few seconds (the active dot fills up meanwhile) and starts
 * over after the last card. It holds still while the pointer or the focus is on it, during a
 * drag, while it is off screen, and for good with reduced motion. Automated browsers don't autoplay, so tests and screenshots see a still rail.
 */
export function ProviderRail({
  heading,
  labels,
  children,
}: {
  heading: ReactNode;
  /** The name of each card, in order, for the dots ("Show Cisco"). */
  labels: readonly string[];
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [held, setHeld] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);

  const cards = useCallback(() => Array.from(rail.current?.children ?? []) as HTMLElement[], []);

  /** Where the rail must scroll to put card `index` at its start. */
  const offsetOf = useCallback((card: HTMLElement) => {
    const el = rail.current;
    if (!el) return 0;
    return card.offsetLeft - (Number.parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const el = rail.current;
      const list = cards();
      const card = list[Math.max(0, Math.min(index, list.length - 1))];
      if (!el || !card) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ left: offsetOf(card), behavior: reduced ? 'auto' : 'smooth' });
    },
    [cards, offsetOf],
  );

  /** Reads the position back: which card is at the start, and whether either end is reached. */
  const sync = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft >= max - 2;
    const list = cards();
    let nearest = 0;
    list.forEach((card, i) => {
      const current = list[nearest];
      if (
        current &&
        Math.abs(offsetOf(card) - el.scrollLeft) < Math.abs(offsetOf(current) - el.scrollLeft)
      ) {
        nearest = i;
      }
    });
    setAtStart(start);
    setAtEnd(end);
    // At the far end the last cards can't reach the start: the last one counts as shown.
    setActive(end && max > 0 ? list.length - 1 : nearest);
  }, [cards, offsetOf]);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    sync();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sync]);

  // Autoplay only where it makes sense: motion allowed, not under automation, and seen.
  useEffect(() => {
    const el = rail.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduced || navigator.webdriver || !('IntersectionObserver' in window)) return;
    setCanAutoplay(true);
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const running = canAutoplay && !held && onScreen && !dragging && labels.length > 1;

  // One timer per card: moving by hand restarts the count from the new card.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => goTo(atEnd ? 0 : active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [running, active, atEnd, goTo]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };

  // Dragging with a mouse; touch and trackpads already scroll natively.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !rail.current) return;
    drag.current = { x: event.clientX, left: rail.current.scrollLeft, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const el = rail.current;
    if (!state || !el) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      setDragging(true);
      el.setPointerCapture(event.pointerId);
    }
    el.scrollLeft = state.left - dx;
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved || !rail.current) return;
    rail.current.releasePointerCapture(event.pointerId);
    setDragging(false);
    // Come to rest on a card, leaning the way the drag went.
    const dx = event.clientX - state.x;
    const list = cards();
    const el = rail.current;
    let nearest = 0;
    list.forEach((card, i) => {
      const current = list[nearest];
      if (
        current &&
        Math.abs(offsetOf(card) - el.scrollLeft) < Math.abs(offsetOf(current) - el.scrollLeft)
      ) {
        nearest = i;
      }
    });
    const lean = Math.abs(dx) > 60 && nearest === active ? (dx < 0 ? 1 : -1) : 0;
    goTo(nearest + lean);
  };

  const arrow =
    'grid flex-none place-items-center size-11 border-[1.5px] border-ln2 rounded-full bg-bg text-ink cursor-pointer transition-[border-color,opacity] hover:border-ink disabled:opacity-35 disabled:cursor-default disabled:hover:border-ln2';
  const total = labels.length;

  return (
    <>
      <div className="flex items-end justify-between gap-12 px-18 max-lg:px-8 max-md:px-4">
        {heading}
        {total > 1 && (
          <div className="flex flex-none items-center gap-2.5 max-md:hidden">
            <span
              aria-hidden
              className="me-2 font-mono text-[13px] tabular-nums text-ink3 [&_b]:font-medium [&_b]:text-ink"
            >
              <b>{pad(active + 1)}</b> / {pad(total)}
            </span>
            <button
              type="button"
              aria-label="Previous providers"
              className={arrow}
              disabled={atStart}
              onClick={() => goTo(active - 1)}
            >
              <Icon name="arrow_back" size={20} />
            </button>
            <button
              type="button"
              aria-label="Next providers"
              className={arrow}
              disabled={atEnd}
              onClick={() => goTo(active + 1)}
            >
              <Icon name="arrow_forward" size={20} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={rail}
        role="region"
        aria-roledescription="carousel"
        aria-label="Funded certifications by provider"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'flex gap-5 -mt-5 -mb-11 px-18 pt-7 pb-14 overflow-x-auto scroll-px-18 [scrollbar-width:none] max-lg:px-8 max-lg:scroll-px-8 max-md:gap-3 max-md:px-4 max-md:scroll-px-4',
          // Free movement while the mouse drags; the rail snaps to a card again afterwards.
          dragging
            ? 'cursor-grabbing select-none [&_img]:pointer-events-none'
            : 'snap-x snap-mandatory md:cursor-grab',
          // Fade the side that still has cards to show.
          !atStart &&
            !atEnd &&
            '[mask-image:linear-gradient(to_right,transparent,#000_72px,#000_calc(100%-72px),transparent)]',
          atStart &&
            !atEnd &&
            '[mask-image:linear-gradient(to_right,#000_calc(100%-72px),transparent)]',
          !atStart && atEnd && '[mask-image:linear-gradient(to_right,transparent,#000_72px)]',
        )}
      >
        {children}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2 px-18 max-lg:px-8 max-md:gap-1 max-md:px-4">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-label={`Show ${label}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
              className="tap-target group grid place-items-center h-8 px-1 cursor-pointer"
            >
              <span
                className={cn(
                  'relative block h-3 overflow-hidden rounded-full transition-[width,background-color] duration-300 max-md:h-2.5',
                  i === active
                    ? 'w-12 bg-ln2 max-md:w-9'
                    : 'w-3 bg-ln2 group-hover:bg-ink3 max-md:w-2.5',
                )}
              >
                {i === active && (
                  // Fills while the card waits; full when the carousel stands still.
                  <span
                    key={`${active}-${running}`}
                    className={cn(
                      'absolute inset-0 rounded-full bg-ink origin-left',
                      running && 'animate-dot-fill',
                    )}
                    style={running ? { animationDuration: `${AUTOPLAY_MS}ms` } : undefined}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
