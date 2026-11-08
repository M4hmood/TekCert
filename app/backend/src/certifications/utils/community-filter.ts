import type { CommunityQuery } from '@tekcert/types';
import type { CommunityFilter, UserWithEnrolment } from '../../users/users.service';

/**
 * Turns the "who to ask" scope into a filter relative to the student asking. Returns null when
 * the scope can't apply (no class saved yet), which means nobody.
 */
export function communityFilterFor(
  viewer: UserWithEnrolment,
  query: CommunityQuery,
): CommunityFilter | null {
  const filter: CommunityFilter = { excludeUserId: viewer.id };
  if (query.specialty) filter.classSpecialty = query.specialty;
  if (query.year) filter.year = query.year;

  if (query.scope === 'institute') return filter;
  if (!viewer.class) return null;
  switch (query.scope) {
    case 'class':
      return { ...filter, classId: viewer.class.id };
    case 'specialty':
      // ING-4/5 by class specialty, ING-1…3 by the specialty they aim for (null = undecided).
      return {
        ...filter,
        pathSpecialtyId: viewer.class.specialtyId ?? viewer.targetSpecialtyId,
      };
    case 'year':
      // An explicit level filter that differs from the student's own year matches nobody.
      if (query.year && query.year !== viewer.class.year) return null;
      return { ...filter, year: viewer.class.year };
  }
}

/** Shown as a "since" date: the newest first, then by name. */
export function newestFirst<T extends { since: Date; lastName: string }>(a: T, b: T): number {
  return b.since.getTime() - a.since.getTime() || a.lastName.localeCompare(b.lastName);
}
