import type { DashboardPathNodeState } from '@tekcert/types';

export interface PathNodeInput {
  certificationId: string;
  code: string;
  slug: string;
  col: number;
  row: number;
  isActive: boolean;
  prerequisiteId: string | null;
  prerequisiteCode: string | null;
}

export interface SummarizedNode extends PathNodeInput {
  state: DashboardPathNodeState;
}

export interface PathSummary {
  nodes: SummarizedNode[];
  heldCount: number;
  /** The first node I can start: not held, not in progress, prerequisite held or none. */
  next: SummarizedNode | null;
}

/**
 * The dashboard's path strip: every active node in progression order (column, then row), each
 * held, in progress, locked behind a prerequisite I don't hold, or available.
 */
export function summarizePath(
  nodes: PathNodeInput[],
  held: ReadonlySet<string>,
  inProgress: ReadonlySet<string>,
): PathSummary {
  const ordered = nodes
    .filter((node) => node.isActive)
    .sort((a, b) => a.col - b.col || a.row - b.row)
    .map((node): SummarizedNode => ({ ...node, state: stateOf(node, held, inProgress) }));
  return {
    nodes: ordered,
    heldCount: ordered.filter((node) => node.state === 'held').length,
    next: ordered.find((node) => node.state === 'available') ?? null,
  };
}

function stateOf(
  node: PathNodeInput,
  held: ReadonlySet<string>,
  inProgress: ReadonlySet<string>,
): DashboardPathNodeState {
  if (held.has(node.certificationId)) return 'held';
  if (inProgress.has(node.certificationId)) return 'in_progress';
  if (node.prerequisiteId && !held.has(node.prerequisiteId)) return 'locked';
  return 'available';
}

/** The certification in progress touched last: latest tick, else latest start. */
export function pickCurrent<T extends { lastActivityAt: Date; startedAt: Date }>(
  entries: T[],
): T | null {
  let best: T | null = null;
  for (const entry of entries) {
    if (
      !best ||
      entry.lastActivityAt > best.lastActivityAt ||
      (entry.lastActivityAt.getTime() === best.lastActivityAt.getTime() &&
        entry.startedAt > best.startedAt)
    ) {
      best = entry;
    }
  }
  return best;
}
