import type { ResourceKind } from '@tekcert/types';

/** TEK-UP is in Tunis: dates read the same on the server render and in the browser. */
const TIME_ZONE = 'Africa/Tunis';

/** "October 30" */
export function dayMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** "Oct 2026" */
export function monthYear(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Exam length: "130 min" ("130 minutes" in full), or "48 h" for multi-day hands-on exams. */
export function examDuration(minutes: number, full = false): string {
  if (minutes >= 180 && minutes % 60 === 0) return `${minutes / 60} h`;
  return full ? `${minutes} minutes` : `${minutes} min`;
}

/** Study time for a chapter: "90 min", "3 h", "2 h 30". */
export function studyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest}` : `${hours} h`;
}

export const RESOURCE_KIND: Record<ResourceKind, { label: string; filter: string; icon: string }> =
  {
    doc: { label: 'Official documentation', filter: 'Documentation', icon: 'description' },
    video: { label: 'Video', filter: 'Videos', icon: 'play_circle' },
    lab: { label: 'Hands-on lab', filter: 'Labs', icon: 'science' },
    practice: { label: 'Practice', filter: 'Practice', icon: 'quiz' },
  };
