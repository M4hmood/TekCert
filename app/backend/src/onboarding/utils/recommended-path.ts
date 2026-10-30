import type { CertificationLevel, PathNodeState, RecommendedPath } from '@tekcert/types';

export interface PathNodeInput {
  code: string;
  slug: string;
  name: string;
  level: CertificationLevel;
  col: number;
  row: number;
  /** Code of the certification that unlocks this node, if any. */
  prerequisiteCode: string | null;
}

export type TrackNode = RecommendedPath['track'][number];

/**
 * The seeded paths are grids (col = progression, row = track); onboarding shows one track.
 * It picks the row holding most of the student's certifications, the first row on a tie.
 */
export function selectTrack(nodes: PathNodeInput[], held: ReadonlySet<string>): TrackNode[] {
  const rows = new Map<number, PathNodeInput[]>();
  for (const node of nodes) rows.set(node.row, [...(rows.get(node.row) ?? []), node]);

  let best: PathNodeInput[] = [];
  let bestHeld = -1;
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const track = rows.get(row) ?? [];
    const heldCount = track.filter((node) => held.has(node.code)).length;
    if (heldCount > bestHeld) {
      best = track;
      bestHeld = heldCount;
    }
  }

  const ordered = [...best].sort((a, b) => a.col - b.col);
  const next = ordered.find((node) => !held.has(node.code));
  return ordered.map((node) => ({
    code: node.code,
    slug: node.slug,
    name: node.name,
    level: node.level,
    state: nodeState(node, held, node === next),
  }));
}

function nodeState(node: PathNodeInput, held: ReadonlySet<string>, isNext: boolean): PathNodeState {
  if (held.has(node.code)) return 'held';
  if (isNext) return 'next';
  if (node.prerequisiteCode && !held.has(node.prerequisiteCode)) return 'locked';
  return 'available';
}

/** "OB" for Omar Ben Salah. */
export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
