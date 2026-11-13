import { EXPORT_COLUMNS, toCsv } from '@tekcert/types';

export interface ExportData {
  profile: {
    email: string;
    name: string;
    classCode: string | null;
    alumni: boolean;
    /** The ledger's sum. */
    points: number;
    createdAt: Date;
  };
  held: { code: string; name: string; since: Date }[];
  inProgress: { code: string; name: string; done: number; total: number; since: Date }[];
  chapters: { code: string | null; title: string; at: Date }[];
  ledger: {
    code: string | null;
    title: string | null;
    reason: string;
    delta: number;
    at: Date;
  }[];
}

const REASON_LABEL: Record<string, string> = {
  chapter_done: 'chapter finished',
  chapter_undone: 'chapter unticked',
};

/**
 * "Export my data": one file, one row per record, told apart by the first column. The `points`
 * rows are the student's ledger line by line, so they add up to the total on the profile row.
 */
export function buildExport(data: ExportData): string {
  const { profile } = data;
  const iso = (date: Date) => date.toISOString();
  const klass = profile.classCode ?? '';
  return toCsv([
    [...EXPORT_COLUMNS],
    [
      'profile',
      profile.email,
      profile.name,
      profile.alumni ? `Alumni${klass && ` · ${klass}`}` : klass,
      profile.points,
      iso(profile.createdAt),
    ],
    ...data.held.map((cert) => [
      'certification',
      cert.code,
      cert.name,
      'unverified',
      null,
      iso(cert.since),
    ]),
    ...data.inProgress.map((cert) => [
      'certification',
      cert.code,
      cert.name,
      `in progress · ${cert.done} of ${cert.total} chapters`,
      null,
      iso(cert.since),
    ]),
    ...data.chapters.map((chapter) => [
      'chapter',
      chapter.code,
      chapter.title,
      'finished',
      null,
      iso(chapter.at),
    ]),
    ...data.ledger.map((entry) => [
      'points',
      entry.code,
      entry.title,
      REASON_LABEL[entry.reason] ?? entry.reason,
      entry.delta,
      iso(entry.at),
    ]),
  ]);
}
