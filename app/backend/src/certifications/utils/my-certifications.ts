import type { MyCertification } from '@tekcert/types';

interface Entry {
  certificationId: string;
  since: Date;
}

/**
 * One status per certification. Holding it wins over preparing it: a student who declares a
 * certification they had started has finished with it.
 */
export function mergeMyCertifications(
  held: Entry[],
  preparing: Entry[],
  slugOf: (certificationId: string) => string | undefined,
): MyCertification[] {
  const byId = new Map<string, MyCertification>();
  for (const entry of preparing) {
    const slug = slugOf(entry.certificationId);
    if (slug) byId.set(entry.certificationId, { slug, status: 'in_progress', since: iso(entry) });
  }
  for (const entry of held) {
    const slug = slugOf(entry.certificationId);
    if (slug) byId.set(entry.certificationId, { slug, status: 'unverified', since: iso(entry) });
  }
  return [...byId.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

const iso = (entry: Entry) => entry.since.toISOString();
