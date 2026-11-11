import { type ActivityItem, BADGES, type DashboardPathNodeState, levelName } from '@tekcert/types';

/** TEK-UP is in Tunis: the server render and the browser show the same day. */
const TIME_ZONE = 'Africa/Tunis';

const longDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const shortDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: TIME_ZONE,
});
const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: TIME_ZONE,
});
const ymd = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
});
const monthNumber = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: TIME_ZONE });

/** Fall runs September to January, Spring February to August. */
export function semester(now: Date): 'Fall semester' | 'Spring semester' {
  const month = Number(monthNumber.format(now));
  return month >= 9 || month === 1 ? 'Fall semester' : 'Spring semester';
}

/** "Tuesday, November 10, 2026 · Fall semester" (desktop) and "Tuesday, November 10" (phone). */
export function todayLabels(now: Date): { long: string; short: string } {
  return { long: `${longDay.format(now)} · ${semester(now)}`, short: shortDay.format(now) };
}

/** Whole days between two instants, counted on Tunis calendar days. */
function daysBetween(then: Date, now: Date): number {
  const day = (d: Date) => Date.parse(`${ymd.format(d)}T00:00:00Z`);
  return Math.round((day(now) - day(then)) / 86_400_000);
}

/** "just now", "25 min ago", "2 h ago", "yesterday", "3 days ago", then "Oct 2". */
export function timeAgo(iso: string, now: Date): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  const days = daysBetween(then, now);
  if (days <= 0) {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return monthDay.format(then);
}

/** "about 20 h of prep" from minutes. */
export function prepTime(minutes: number): string {
  const hours = Math.max(1, Math.round(minutes / 60));
  return `about ${hours} h of prep`;
}

export interface ActivityLine {
  /** What follows the first name: "finished 3 AZ-104 chapters". */
  what: string;
  icon: string;
  /** Tailwind classes for the round icon. */
  tone: string;
}

const GOLD = 'bg-gold-sf text-gold';
const PRI = 'bg-pri-sf text-pri';
const OK = 'bg-ok-sf text-ok';

/** The sentence and icon of one feed line, as in the design. */
export function activityLine(
  item: Pick<ActivityItem, 'kind' | 'certification' | 'count' | 'badge' | 'level'>,
): ActivityLine {
  const code = item.certification?.code ?? 'a certification';
  switch (item.kind) {
    case 'certification_started':
      return { what: `started ${code}`, icon: 'play_circle', tone: PRI };
    case 'chapters_done': {
      const count = item.count ?? 1;
      return {
        what: `finished ${count} ${code} ${count === 1 ? 'chapter' : 'chapters'}`,
        icon: 'check_box',
        tone: PRI,
      };
    }
    case 'syllabus_completed':
      return { what: `completed the ${code} syllabus`, icon: 'task_alt', tone: OK };
    case 'badge_earned': {
      const badge = item.badge ? BADGES[item.badge] : null;
      return {
        what: `earned the ${badge?.name ?? 'new'} badge`,
        icon: badge?.icon ?? 'military_tech',
        tone: GOLD,
      };
    }
    case 'level_reached':
      return {
        what: `reached ${levelName(item.level ?? 1)} level`,
        icon: 'military_tech',
        tone: GOLD,
      };
  }
}

/** Path node looks (design: Tableau-de-bord path strip). Held = unverified in Release 1. */
export const NODE_LOOK: Record<
  DashboardPathNodeState,
  { icon: string; className: string; label: string }
> = {
  held: {
    icon: 'pending',
    className: 'border-dashed border-ln2 bg-bg text-ink2',
    label: 'earned, unverified',
  },
  in_progress: {
    icon: 'clock_loader_40',
    className: 'border-pri bg-pri text-pri-ink',
    label: 'in progress',
  },
  available: {
    icon: 'radio_button_unchecked',
    className: 'border-ln2 bg-sf text-ink2',
    label: 'available',
  },
  locked: { icon: 'lock', className: 'border-sf2 bg-sf2 text-ink3', label: 'locked' },
};
