'use client';

import { BADGES, type ChapterTickResult, ChapterTickResultSchema } from '@tekcert/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteJson, putJson, withSessionRefresh } from '@/lib/client-api';
import { useToast } from '@/lib/use-toast';

export interface ChapterTicksOptions {
  /** Chapters already ticked. */
  initialDone: readonly string[];
  /** Called with the API's answer after every change it recorded. */
  onResult?: (result: ChapterTickResult) => void;
  /** A toast shared with the rest of the screen; the hook makes its own otherwise. */
  toaster?: Toaster;
}

export type Toaster = ReturnType<typeof useToast>;

/**
 * Ticking chapters, shared by the certification page and the dashboard. The box changes at once
 * (optimistic); the toast confirms the points and offers Undo. If the API refuses, the box goes
 * back and the toast says why. A chapter can't be clicked again while its request is in flight.
 */
export function useChapterTicks({ initialDone, onResult, toaster }: ChapterTicksOptions) {
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set(initialDone));
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const inFlight = useRef(new Set<string>());
  const own = useToast();
  const { toast, show, dismiss } = toaster ?? own;
  // Undo calls back into `set`; a ref avoids a callback that refers to itself.
  const undo = useRef<(chapterId: string, tick: boolean) => void>(() => undefined);

  const set = useCallback(
    async (chapterId: string, tick: boolean, offerUndo: boolean): Promise<void> => {
      if (inFlight.current.has(chapterId)) return;
      inFlight.current.add(chapterId);
      setPending(new Set(inFlight.current));
      setDone((prev) => toggled(prev, chapterId, tick));

      const path = `/me/chapters/${chapterId}`;
      const result = await withSessionRefresh(() =>
        tick
          ? putJson(path, {}, ChapterTickResultSchema)
          : deleteJson(path, ChapterTickResultSchema),
      );
      inFlight.current.delete(chapterId);
      setPending(new Set(inFlight.current));

      if (!result.ok) {
        setDone((prev) => toggled(prev, chapterId, !tick));
        show(result.problem.detail ?? "That chapter couldn't be saved. Try again.", {
          tone: 'error',
        });
        return;
      }
      if (!result.data.changed) return;
      onResult?.(result.data);
      show(messageFor(result.data, tick), {
        ...(offerUndo && {
          action: { label: 'Undo', onClick: () => undo.current(chapterId, !tick) },
        }),
      });
    },
    [onResult, show],
  );

  useEffect(() => {
    undo.current = (chapterId, tick) => void set(chapterId, tick, false);
  }, [set]);

  const toggle = useCallback(
    (chapterId: string) => set(chapterId, !done.has(chapterId), true),
    [done, set],
  );

  return { done, pending, toggle, toast, dismissToast: dismiss };
}

function toggled(set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function messageFor(result: ChapterTickResult, ticked: boolean): string {
  if (!ticked) return 'Chapter unticked · −10 points';
  const { done, total } = result.certification;
  const base =
    total > 0 && done === total
      ? 'Syllabus complete · you’re ready for the exam'
      : 'Chapter done · +10 points';
  const badges = result.newBadges.map((key) => `${BADGES[key].name} badge earned`);
  return [base, ...badges].join(' · ');
}
