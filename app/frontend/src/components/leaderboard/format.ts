import {
  LEADERBOARD_PERIODS,
  LEADERBOARD_SCOPES,
  type LeaderboardMe,
  type LeaderboardPeriod,
  type LeaderboardScope,
  type StudentLeaderboard,
} from '@tekcert/types';
import { groupOf } from '@/components/community/format';

export const BOARD_VIEWS = ['students', 'specialties'] as const;
export type BoardView = (typeof BOARD_VIEWS)[number];

/** What the leaderboard keeps in the URL. */
export interface BoardFilters {
  view: BoardView;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
}

export const DEFAULT_BOARD: BoardFilters = {
  view: 'students',
  scope: 'specialty',
  period: 'month',
};

/** Reads the filters from the page URL; anything unknown falls back to the default. */
export function parseBoardFilters(
  params: Record<string, string | string[] | undefined>,
): BoardFilters {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    view: BOARD_VIEWS.find((view) => view === first('view')) ?? DEFAULT_BOARD.view,
    scope: LEADERBOARD_SCOPES.find((scope) => scope === first('scope')) ?? DEFAULT_BOARD.scope,
    period:
      LEADERBOARD_PERIODS.find((period) => period === first('period')) ?? DEFAULT_BOARD.period,
  };
}

/** The page URL's query: defaults are left out, and the scope only matters for students. */
export function boardSearch(filters: BoardFilters): string {
  const params = new URLSearchParams();
  if (filters.view !== DEFAULT_BOARD.view) params.set('view', filters.view);
  if (filters.view === 'students' && filters.scope !== DEFAULT_BOARD.scope) {
    params.set('scope', filters.scope);
  }
  if (filters.period !== DEFAULT_BOARD.period) params.set('period', filters.period);
  return params.toString();
}

/** The API path for a board. */
export function boardPath(filters: BoardFilters): string {
  return filters.view === 'students'
    ? `/leaderboard/students?scope=${filters.scope}&period=${filters.period}`
    : `/leaderboard/specialties?period=${filters.period}`;
}

export interface BoardScopeLabel {
  value: LeaderboardScope;
  /** Phones: "My class". */
  short: string;
  /** Desktop: "My specialty · CIM". */
  long: string;
  /** After "Your position ·": "ING-4 A", "CIM", "institute". */
  position: string;
}

export function boardScopeLabels(viewer: StudentLeaderboard['viewer']): BoardScopeLabel[] {
  const group =
    viewer.classCode && viewer.year ? `ING-${viewer.year} ${groupOf(viewer.classCode)}` : null;
  return [
    { value: 'class', short: 'My class', long: 'My class', position: group ?? 'my class' },
    {
      value: 'specialty',
      short: 'Specialty',
      long: viewer.specialty ? `My specialty · ${viewer.specialty}` : 'My specialty',
      position: viewer.specialty ?? 'my specialty',
    },
    { value: 'institute', short: 'The institute', long: 'Whole institute', position: 'institute' },
  ];
}

/** Places moved over the last week, as the table shows them. */
export function changeLook(change: number | null): {
  icon: string;
  text: string;
  className: string;
  label: string;
} {
  if (change === null) {
    return { icon: 'remove', text: '', className: 'text-ink3', label: 'Not ranked a week ago' };
  }
  if (change > 0) {
    return {
      icon: 'arrow_upward',
      text: String(change),
      className: 'text-ok',
      label: `Up ${change} ${change === 1 ? 'place' : 'places'} this week`,
    };
  }
  if (change < 0) {
    return {
      icon: 'arrow_downward',
      text: String(-change),
      className: 'text-err',
      label: `Down ${-change} ${change === -1 ? 'place' : 'places'} this week`,
    };
  }
  return { icon: 'remove', text: '', className: 'text-ink3', label: 'No change this week' };
}

/** The line under "You" on the phone's pinned row: "↑ 3 places this week"; null without one. */
export function changeLine(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return 'No change this week';
  const places = Math.abs(change) === 1 ? 'place' : 'places';
  return `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} ${places} this week`;
}

/** The sentence on the "Your position" card. */
export function gapSentence(me: LeaderboardMe, anyPoints: boolean): string {
  if (me.gap) {
    const points = `${me.gap.points} ${me.gap.points === 1 ? 'point' : 'points'}`;
    return `${points} behind ${me.gap.firstName ?? 'the next student'}. Each chapter you finish is +10.`;
  }
  return anyPoints
    ? 'You’re in the lead.'
    : 'Nobody has points here yet. Finish a chapter to take the lead.';
}
