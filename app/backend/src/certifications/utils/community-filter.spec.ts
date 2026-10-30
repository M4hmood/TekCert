import type { UserWithEnrolment } from '../../users/users.service';
import { communityFilterFor } from './community-filter';

const viewer = (overrides: Partial<UserWithEnrolment> = {}): UserWithEnrolment =>
  ({
    id: 'me',
    targetSpecialtyId: null,
    targetSpecialty: null,
    class: { id: 'class-4-cim-c', year: 4, specialtyId: 'cim', specialty: null },
    ...overrides,
  }) as UserWithEnrolment;

const ing2 = (targetSpecialtyId: string | null) =>
  viewer({
    targetSpecialtyId,
    class: { id: 'class-2-b', year: 2, specialtyId: null, specialty: null },
  } as Partial<UserWithEnrolment>);

describe('communityFilterFor', () => {
  it('always leaves the student asking out', () => {
    expect(communityFilterFor(viewer(), { scope: 'institute' })).toEqual({ excludeUserId: 'me' });
  });

  it('limits "my class" to the class', () => {
    expect(communityFilterFor(viewer(), { scope: 'class' })).toEqual({
      excludeUserId: 'me',
      classId: 'class-4-cim-c',
    });
  });

  it('uses the class specialty in ING-4/5 and the target in ING-1…3', () => {
    expect(communityFilterFor(viewer(), { scope: 'specialty' })?.pathSpecialtyId).toBe('cim');
    expect(communityFilterFor(ing2('sdia'), { scope: 'specialty' })?.pathSpecialtyId).toBe('sdia');
    expect(communityFilterFor(ing2(null), { scope: 'specialty' })?.pathSpecialtyId).toBeNull();
  });

  it('limits "my level" to the same year, and a different level filter to nobody', () => {
    expect(communityFilterFor(viewer(), { scope: 'year' })?.year).toBe(4);
    expect(communityFilterFor(viewer(), { scope: 'year', year: 5 })).toBeNull();
  });

  it('adds the specialty and level selects', () => {
    expect(
      communityFilterFor(viewer(), { scope: 'institute', specialty: 'none', year: 2 }),
    ).toEqual({ excludeUserId: 'me', classSpecialty: 'none', year: 2 });
  });

  it('matches nobody for a relative scope when no class is saved', () => {
    expect(communityFilterFor(viewer({ class: null }), { scope: 'class' })).toBeNull();
    expect(communityFilterFor(viewer({ class: null }), { scope: 'institute' })).not.toBeNull();
  });
});
