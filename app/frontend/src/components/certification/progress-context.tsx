'use client';

import { createContext, useContext } from 'react';

/**
 * The student's ticks on this certification, shared by the status card (ring) and the Syllabus
 * tab. Provided by CertificationView; the Syllabus panel is rendered on the server but reads it
 * on the client.
 */
export interface CertificationProgress {
  /** In progress: chapters can be ticked. */
  canTick: boolean;
  /** Not started yet: the boxes show, disabled, with a hint to press Start. */
  canStart: boolean;
  done: ReadonlySet<string>;
  pending: ReadonlySet<string>;
  toggle: (chapterId: string) => void;
}

const NONE: CertificationProgress = {
  canTick: false,
  canStart: false,
  done: new Set(),
  pending: new Set(),
  toggle: () => undefined,
};

export const CertificationProgressContext = createContext<CertificationProgress>(NONE);

export function useCertificationProgress(): CertificationProgress {
  return useContext(CertificationProgressContext);
}
