import {
  boardPositions,
  type LeaderboardMe,
  type LeaderboardPerson,
  type LeaderboardRow,
  rankByPoints,
  type Specialty,
  type SpecialtyRow,
} from '@tekcert/types';

export interface Total {
  points: number;
  chapters: number;
}

export interface BoardMember {
  person: LeaderboardPerson;
  /** False when the student hides their name. */
  visible: boolean;
}

export interface StudentBoard {
  total: number;
  rows: LeaderboardRow[];
  me: Omit<LeaderboardMe, 'continue'> | null;
}

const NOTHING: Total = { points: 0, chapters: 0 };

/**
 * How many places a student gained since `previous` (the same totals a week ago; null when
 * there is no "week ago" to compare with). Null for a student without points then: everyone at
 * zero ties for first, and comparing with that would show a fall for anyone who started since.
 */
function changeSince(
  memberIds: readonly string[],
  previous: ReadonlyMap<string, Pick<Total, 'points'>> | null,
): (id: string, rank: number) => number | null {
  const rankBefore = previous
    ? new Map(
        rankByPoints(memberIds.map((id) => ({ id, points: previous.get(id)?.points ?? 0 }))).map(
          (entry) => [entry.id, entry.rank],
        ),
      )
    : null;
  return (id, rank) => {
    const before = rankBefore?.get(id);
    if (before === undefined || (previous?.get(id)?.points ?? 0) <= 0) return null;
    return before - rank;
  };
}

export interface RankChange {
  id: string;
  rank: number;
  /** Places gained since last week; negative when lost. */
  change: number;
}

/**
 * The members of one board whose rank moved since `previous`, for the weekly notification.
 * Students who weren't really ranked a week ago (no points then) are left out.
 */
export function rankChanges(
  memberIds: readonly string[],
  current: ReadonlyMap<string, Pick<Total, 'points'>>,
  previous: ReadonlyMap<string, Pick<Total, 'points'>>,
): RankChange[] {
  const change = changeSince(memberIds, previous);
  return rankByPoints(memberIds.map((id) => ({ id, points: current.get(id)?.points ?? 0 })))
    .map((entry) => ({ id: entry.id, rank: entry.rank, change: change(entry.id, entry.rank) }))
    .filter((entry): entry is RankChange => entry.change !== null && entry.change !== 0);
}

/**
 * Ranks every member of a scope on the points of the period and keeps the rows a board shows:
 * the top, and the viewer with their neighbours. `previous` holds the same period's totals a
 * week ago (null when the period is younger than that): the change is the places gained since,
 * for students who had points then.
 *
 * A member who hides their name stays ranked, without their `person`, except on their own row.
 */
export function buildStudentBoard(input: {
  members: readonly BoardMember[];
  viewerId: string;
  current: ReadonlyMap<string, Total>;
  previous: ReadonlyMap<string, Total> | null;
}): StudentBoard {
  const { members, viewerId, current, previous } = input;
  const byId = new Map(members.map((member) => [member.person.id, member]));
  const ranked = rankByPoints(
    members.map(({ person }) => ({ id: person.id, ...(current.get(person.id) ?? NOTHING) })),
  );
  const change = changeSince(
    members.map(({ person }) => person.id),
    previous,
  );

  const mine = ranked.find((entry) => entry.id === viewerId) ?? null;
  const shown = new Set(boardPositions(ranked.length, mine?.position ?? null));
  const rows = ranked
    .filter((entry) => shown.has(entry.position))
    .map((entry): LeaderboardRow => {
      const member = byId.get(entry.id);
      const isMe = entry.id === viewerId;
      return {
        rank: entry.rank,
        position: entry.position,
        change: change(entry.id, entry.rank),
        points: entry.points,
        chapters: entry.chapters,
        isMe,
        person: member && (member.visible || isMe) ? member.person : null,
      };
    });

  if (!mine) return { total: ranked.length, rows, me: null };
  // The nearest student with strictly more points: the last one before my tie group.
  const above = ranked.filter((entry) => entry.points > mine.points).at(-1);
  const aboveMember = above && byId.get(above.id);
  return {
    total: ranked.length,
    rows,
    me: {
      rank: mine.rank,
      points: mine.points,
      chapters: mine.chapters,
      change: change(mine.id, mine.rank),
      visible: byId.get(mine.id)?.visible ?? true,
      gap: above
        ? {
            points: above.points - mine.points,
            firstName: aboveMember?.visible ? aboveMember.person.firstName : null,
          }
        : null,
    },
  };
}

/**
 * Average points per student for each specialty, highest first. `specialtyOf` gives a
 * student's specialty (class specialty, or the one aimed for); students without one are left
 * out.
 */
export function buildSpecialtyBoard(input: {
  students: readonly { id: string; specialty: Specialty | null }[];
  current: ReadonlyMap<string, Total>;
  mine: string | null;
}): SpecialtyRow[] {
  const groups = new Map<string, { specialty: Specialty; students: number; points: number }>();
  for (const student of input.students) {
    if (!student.specialty) continue;
    const group = groups.get(student.specialty.code) ?? {
      specialty: student.specialty,
      students: 0,
      points: 0,
    };
    group.students += 1;
    group.points += input.current.get(student.id)?.points ?? 0;
    groups.set(student.specialty.code, group);
  }
  const averaged = [...groups.values()].map((group) => ({
    id: group.specialty.code,
    points: Math.round(group.points / group.students),
    group,
  }));
  return rankByPoints(averaged).map(({ rank, points, group }) => ({
    ...group.specialty,
    rank,
    students: group.students,
    average: points,
    isMine: group.specialty.code === input.mine,
  }));
}
