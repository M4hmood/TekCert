import { GroupSchema, type SavedEnrolment, SpecialtyCodeSchema, YearSchema } from '@tekcert/types';
import type { UserWithEnrolment } from '../users.service';

/** The student's class as onboarding and Settings show it. Null before a class is saved. */
export function toSavedEnrolment(
  user: UserWithEnrolment,
  classmates: number,
): SavedEnrolment | null {
  if (!user.class) return null;
  return {
    year: YearSchema.parse(user.class.year),
    group: GroupSchema.parse(user.class.group),
    specialty: user.class.specialty ? SpecialtyCodeSchema.parse(user.class.specialty.code) : null,
    targetSpecialty: user.targetSpecialty
      ? SpecialtyCodeSchema.parse(user.targetSpecialty.code)
      : null,
    classCode: user.class.code,
    classmates,
  };
}
