import { playDeluminatorSound } from './deluminator-sound';

/**
 * The theme change, in the manner of a Deluminator. Going dark, each pool of light on the page
 * gathers back into its lamp, becomes an orb and streaks into the button. Going light is the same
 * thing played backwards: the orbs fly out of the button and each one blooms into a pool of light.
 *
 * Built on a view transition: the light version of the page is the top layer, a mask shows only
 * the pools of light, and a canvas layer above draws the orbs (see animations.css).
 */

export type Theme = 'light' | 'dark';
export interface Point {
  x: number;
  y: number;
}

/** Paced to the main whoosh of each sound clip: about 2 s in, 1.4 s out. */
const STAGGER_MS = { dark: 208, light: 118 };
const POOL_MS = 440;
const FLIGHT_MS = 380;
const FLASH_MS = 220;
/** The closing moment at the button, which lasts as long as the end of the sound clips. */
const FINALE_MS = 1000;
const FINALE_RINGS = 3;
const FINALE_RING_REACH_PX = 52;
const FEATHER_PX = 96;
const ORB_RADIUS_PX = 34;
const MAX_TRAIL_STAMPS = 22;
const TRAIL_SPACING_PX = 8;
const TRAIL_LENGTH = 0.32;
const SPRITE_PX = 128;
const MAX_CANVAS_SCALE = 2;

/** A pool must reach past its own cell, because the lamps are scattered off the cell centres. */
const POOL_REACH = 1.4;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeIn = (t: number) => t ** 1.9;
const easeOut = (t: number) => 1 - (1 - t) ** 1.9;
/** Starts and ends at rest, so a pool never visibly snaps into motion. */
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Repeatable scatter in -1…1, so the lights sit in the same places every time. */
const scatter = (index: number, seed: number) => {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

/** Six lamps on every screen: three by two when it is wide, two by three when it is narrow. */
const gridFor = (width: number) =>
  width >= 768 ? { columns: 3, rows: 2 } : { columns: 2, rows: 3 };

/** The "lamps": a scattered grid over the screen, nearest the button first. */
export function lightSources(width: number, height: number, button: Point): Point[] {
  const { columns, rows } = gridFor(width);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const sources: Point[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      sources.push({
        x: (column + 0.5 + scatter(index, 1) * 0.18) * cellWidth,
        y: (row + 0.5 + scatter(index, 2) * 0.18) * cellHeight,
      });
    }
  }
  const distance = (point: Point) => Math.hypot(point.x - button.x, point.y - button.y);
  return sources.sort((a, b) => distance(a) - distance(b));
}

/** A point on a shallow arc between two points. Odd and even orbs curve opposite ways. */
function onArc(from: Point, to: Point, t: number, index: number): Point {
  const bend = (index % 2 === 0 ? 1 : -1) * 0.16;
  const control = {
    x: (from.x + to.x) / 2 - (to.y - from.y) * bend,
    y: (from.y + to.y) / 2 + (to.x - from.x) * bend,
  };
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/** One glow drawn once and stamped everywhere: far cheaper than a new gradient per stamp. */
let cachedSprite: HTMLCanvasElement | null = null;

function getSprite() {
  if (cachedSprite) return cachedSprite;
  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_PX;
  sprite.height = SPRITE_PX;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const middle = SPRITE_PX / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.1, '#fff8e0');
  gradient.addColorStop(0.24, 'rgba(255, 224, 140, 0.9)');
  gradient.addColorStop(0.45, 'rgba(240, 186, 80, 0.42)');
  gradient.addColorStop(0.72, 'rgba(229, 170, 60, 0.12)');
  // The same gold, not "transparent", which would fade through grey.
  gradient.addColorStop(1, 'rgba(229, 170, 60, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  cachedSprite = sprite;
  return sprite;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_SCALE);
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.deluminator = '';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    viewTransitionName: 'theme-orbs',
  });
  const context = canvas.getContext('2d');
  context?.scale(scale, scale);
  // Where glows overlap they add up, so a tail burns brighter at its core.
  if (context) context.globalCompositeOperation = 'lighter';
  return canvas;
}

/** Changes the theme with the effect, or at once without view transitions or with reduced motion. */
export function playDeluminator(theme: Theme, button: HTMLElement, apply: () => void) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reducedMotion) {
    apply();
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const box = button.getBoundingClientRect();
  const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const goingDark = theme === 'dark';
  const nearestFirst = lightSources(width, height, centre);
  // Going dark sweeps from the far side towards the button: going light, played backwards.
  const sources = goingDark ? [...nearestFirst].reverse() : nearestFirst;
  const { columns, rows } = gridFor(width);
  const poolRadius = (Math.hypot(width / columns, height / rows) / 2) * POOL_REACH;
  const stagger = STAGGER_MS[theme];
  const orbsMs = (sources.length - 1) * stagger + POOL_MS + FLIGHT_MS + (goingDark ? FLASH_MS : 0);
  const duration = orbsMs + FINALE_MS;

  // Going dark: the pool gathers, then the orb flies. Going light: the orb flies, then the pool blooms.
  const poolStart = (index: number) => index * stagger + (goingDark ? 0 : FLIGHT_MS);
  const flightStart = (index: number) => index * stagger + (goingDark ? POOL_MS : 0);

  /**
   * Only the pools of light show the light page. Each mask layer is sized to its own pool, and
   * pools with nothing to show are left out, so the browser paints far less than the full screen
   * six times over.
   */
  const maskAt = (time: number) => {
    const images: string[] = [];
    const sizes: string[] = [];
    const positions: string[] = [];
    sources.forEach((source, index) => {
      const progress = clamp((time - poolStart(index)) / POOL_MS);
      const size = goingDark ? 1 - smooth(progress) : smooth(progress);
      const outer = size * (poolRadius + FEATHER_PX);
      if (outer < 1) return;
      const solid = Math.max(0, (outer - FEATHER_PX) / outer) * 100;
      const at = (share: number) => (solid + (100 - solid) * share).toFixed(1);
      images.push(
        `radial-gradient(closest-side, #000 ${solid.toFixed(1)}%, rgba(0,0,0,.74) ${at(0.3)}%, rgba(0,0,0,.26) ${at(0.7)}%, transparent)`,
      );
      sizes.push(`${(outer * 2).toFixed(1)}px`);
      positions.push(`${(source.x - outer).toFixed(1)}px ${(source.y - outer).toFixed(1)}px`);
    });
    // "none" would mean no mask at all, which is the opposite of no pools.
    if (!images.length) return HIDDEN_MASK;
    return {
      maskImage: images.join(', '),
      maskSize: sizes.join(', '),
      maskPosition: positions.join(', '),
    };
  };

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const sprite = getSprite();

  const stamp = (at: Point, radius: number, alpha: number) => {
    if (!context) return;
    context.globalAlpha = alpha;
    context.drawImage(sprite, at.x - radius, at.y - radius, radius * 2, radius * 2);
  };

  /** The flame at the lamp: it grows as the pool gathers into it, and fades as the pool blooms. */
  const drawFlame = (index: number, time: number) => {
    const source = sources[index];
    const progress = (time - poolStart(index)) / POOL_MS;
    if (!source || progress < 0 || progress > 1) return;
    const strength = smooth(goingDark ? progress : 1 - progress);
    stamp(source, ORB_RADIUS_PX * 2.6 * (0.4 + 0.6 * strength), strength * 0.55);
    stamp(source, ORB_RADIUS_PX * (0.35 + 0.65 * strength), strength);
  };

  const drawOrb = (index: number, time: number) => {
    const source = sources[index];
    const progress = (time - flightStart(index)) / FLIGHT_MS;
    if (!source || progress < 0 || progress > 1) return;
    const positionAt = (t: number) =>
      goingDark
        ? onArc(source, centre, easeIn(clamp(t)), index)
        : onArc(centre, source, easeOut(clamp(t)), index);
    // Going dark it thins out as it nears the button; going light it swells as it nears the lamp.
    const size = goingDark ? 1 - 0.45 * progress : 0.55 + 0.45 * progress;
    // As many stamps as the tail's length on screen needs: slow orbs take few, fast ones more.
    const tailStart = positionAt(progress - TRAIL_LENGTH);
    const tailEnd = positionAt(progress);
    const tailPx = Math.hypot(tailEnd.x - tailStart.x, tailEnd.y - tailStart.y);
    const stamps = Math.min(MAX_TRAIL_STAMPS, Math.ceil(tailPx / TRAIL_SPACING_PX));
    for (let step = stamps; step >= 1; step -= 1) {
      const behind = step / stamps;
      if (progress - behind * TRAIL_LENGTH < 0) continue;
      const position = positionAt(progress - behind * TRAIL_LENGTH);
      stamp(position, ORB_RADIUS_PX * size * (1 - behind * 0.85), (1 - behind) ** 2 * 0.3);
    }
    const head = positionAt(progress);
    stamp(head, ORB_RADIUS_PX * size * 2.2, 0.5);
    stamp(head, ORB_RADIUS_PX * size, 1);
  };

  /** The button lights up each time an orb reaches it or leaves it. */
  const drawFlash = (index: number, time: number) => {
    const at = flightStart(index) + (goingDark ? FLIGHT_MS : 0);
    const progress = (time - at) / FLASH_MS;
    if (progress < 0 || progress > 1) return;
    stamp(centre, 40, Math.sin(Math.PI * progress) * 0.55);
  };

  /**
   * The closing second, inside the button. Going dark, it holds the light it has taken in as a
   * small ember that breathes while faint rings settle into it, then goes out on the final click.
   * Going light, the ember left behind gently fades as the last rings drift away.
   */
  const drawFinale = (time: number) => {
    if (!context || time < 0) return;
    const progress = clamp(time / FINALE_MS);
    const breath = 0.5 + 0.5 * Math.sin(progress * Math.PI * 3 - Math.PI / 2);
    if (goingDark) {
      const snuff = 1 - smooth(clamp((progress - 0.86) / 0.14));
      const arrive = smooth(clamp(progress / 0.2));
      stamp(centre, (26 + 8 * breath) * (0.35 + 0.65 * snuff), arrive * snuff * 0.95);
      stamp(centre, (11 + 3 * breath) * snuff, arrive * snuff);
    } else {
      stamp(centre, 30 + 14 * progress, 0.85 * (1 - smooth(progress)));
    }
    context.strokeStyle = 'rgb(240, 186, 80)';
    context.lineWidth = 1.5;
    for (let ring = 0; ring < FINALE_RINGS; ring += 1) {
      const local = (progress - ring * 0.14) / 0.56;
      if (local <= 0 || local >= 1) continue;
      const travel = goingDark ? 1 - smooth(local) : smooth(local);
      context.globalAlpha = Math.sin(Math.PI * local) * 0.28;
      context.beginPath();
      context.arc(centre.x, centre.y, 20 + FINALE_RING_REACH_PX * travel, 0, Math.PI * 2);
      context.stroke();
    }
  };

  let maskAnimation: Animation | null = null;

  const finish = () => {
    // It would otherwise stay applied and hide the same layer of the next theme change.
    maskAnimation?.cancel();
    delete root.dataset.themeSwitching;
    canvas.remove();
  };

  playDeluminatorSound(theme);
  root.dataset.themeSwitching = `to-${theme}`;
  const transition = document.startViewTransition(() => {
    apply();
    document.body.append(canvas);
  });

  const keyframes = (mask: ReturnType<typeof maskAt>) => ({
    maskImage: [mask.maskImage, mask.maskImage],
    maskSize: [mask.maskSize, mask.maskSize],
    maskPosition: [mask.maskPosition, mask.maskPosition],
  });

  void transition.ready
    .then(() => {
      let shown = maskAt(0);
      // Also what keeps the view transition open while the orbs fly.
      const animation = root.animate(keyframes(shown), {
        duration,
        fill: 'both',
        pseudoElement: `::view-transition-${goingDark ? 'old' : 'new'}(root)`,
      });
      maskAnimation = animation;
      const started = performance.now();
      const frame = (now: number) => {
        const time = now - started;
        if (time >= duration) return;
        const next = maskAt(time);
        // While only orbs are moving the mask is unchanged, and repainting it would be wasted.
        if (next.maskImage !== shown.maskImage || next.maskPosition !== shown.maskPosition) {
          (animation.effect as KeyframeEffect).setKeyframes(keyframes(next));
          shown = next;
        }
        context?.clearRect(0, 0, width, height);
        sources.forEach((_, index) => {
          drawFlame(index, time);
          drawOrb(index, time);
          drawFlash(index, time);
        });
        drawFinale(time - orbsMs);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    })
    // Rejected when the browser skips the transition, e.g. in a background tab.
    .catch(() => undefined);

  void transition.finished.finally(finish);
}

const HIDDEN_MASK = {
  maskImage: 'linear-gradient(transparent, transparent)',
  maskSize: '1px',
  maskPosition: '0px 0px',
};
