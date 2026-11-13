/**
 * Dedupe keys: the event behind a notification, unique per student. Writing the same key twice
 * is ignored, so an event announced once stays announced once.
 */
export const dedupeKey = {
  /** One roll-up per certification and per day (Tunis time). */
  classmatesStarted: (certificationId: string, day: string) => `started:${certificationId}:${day}`,
  /** One per weekly run, named by the day it ran (Tunis time). */
  rankChanged: (day: string) => `rank:${day}`,
  level: (rank: number) => `level:${rank}`,
  badge: (badge: string) => `badge:${badge}`,
  syllabus: (certificationId: string) => `syllabus:${certificationId}`,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where the next page starts: the last row's time (to the millisecond) and id. */
export function encodeCursor(at: Date, id: string): string {
  return `${at.getTime()}_${id}`;
}

export function parseCursor(value: string): { at: Date; id: string } | null {
  const [ms, id, ...rest] = value.split('_');
  if (!ms || !id || rest.length || !/^\d{1,15}$/.test(ms) || !UUID.test(id)) return null;
  return { at: new Date(Number(ms)), id };
}
