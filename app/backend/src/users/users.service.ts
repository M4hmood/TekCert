import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import type { SchoolClass } from '../school/entities/school-class.entity';
import type { Specialty } from '../school/entities/specialty.entity';
import { User } from './entities/user.entity';

/** `class` (with its specialty) and `targetSpecialty` are loaded. */
export type UserWithEnrolment = User & {
  class: (SchoolClass & { specialty: Specialty | null }) | null;
  targetSpecialty: Specialty | null;
};

export type NewUser = Pick<
  User,
  'email' | 'firstName' | 'lastName' | 'passwordHash' | 'visibilityConsentedAt'
>;

/** Profile fields saved together with an onboarding step. */
export type OnboardingChanges = Partial<
  Pick<User, 'classId' | 'targetSpecialtyId' | 'leaderboardVisible'>
>;

/** Owns the `users` table: other modules read and change accounts through this service. */
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email });
  }

  /** With `class` loaded. */
  findWithClass(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id }, relations: { class: true } });
  }

  /** With `class` and the password hash, which is never selected otherwise. */
  findForSignIn(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.class', 'class')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findWithEnrolment(id: string): Promise<UserWithEnrolment | null> {
    const user = await this.users.findOne({
      where: { id },
      relations: { class: { specialty: true }, targetSpecialty: true },
    });
    return user as UserWithEnrolment | null;
  }

  create(fields: NewUser): Promise<User> {
    return this.users.save(this.users.create(fields));
  }

  async markEmailVerified(id: string, at: Date): Promise<void> {
    await this.users.update({ id }, { emailVerifiedAt: at });
  }

  async setPassword(id: string, passwordHash: string, emailVerifiedAt: Date): Promise<void> {
    await this.users.update({ id }, { passwordHash, emailVerifiedAt });
  }

  async avatarKeyOf(id: string): Promise<string | null> {
    const user = await this.users.findOne({ where: { id }, select: { id: true, avatarKey: true } });
    return user?.avatarKey ?? null;
  }

  async setAvatarKey(id: string, avatarKey: string | null): Promise<void> {
    await this.users.update({ id }, { avatarKey });
  }

  countInClass(classId: string): Promise<number> {
    return this.users.countBy({ classId });
  }

  /**
   * Saves `changes` and moves the onboarding step forward, never back (Back in the wizard
   * doesn't undo progress). Pass `manager` to run inside the caller's transaction.
   */
  async advanceOnboarding(
    id: string,
    step: number,
    changes: OnboardingChanges = {},
    manager?: EntityManager,
  ): Promise<void> {
    const users = manager?.getRepository(User) ?? this.users;
    await users.update(
      { id },
      { ...changes, onboardingStep: () => `GREATEST("onboarding_step", ${step})` },
    );
  }

  async completeOnboarding(id: string, at: Date, step: number): Promise<void> {
    await this.users.update({ id }, { onboardingCompletedAt: at, onboardingStep: step });
  }

  /**
   * Other onboarded students on the same path: same specialty class, or same target in
   * ING-1…3. `specialtyId` null means undecided students. Most recent first.
   */
  async findOnboardedPeers(
    userId: string,
    specialtyId: string | null,
    take: number,
  ): Promise<{ users: User[]; count: number }> {
    const qb = this.users
      .createQueryBuilder('u')
      .innerJoin('u.class', 'c')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.onboardingCompletedAt'])
      .where('u.onboardingCompletedAt IS NOT NULL')
      .andWhere('u.id <> :userId', { userId });
    if (specialtyId) {
      qb.andWhere(
        '(c.specialtyId = :specialtyId OR (c.specialtyId IS NULL AND u.targetSpecialtyId = :specialtyId))',
        { specialtyId },
      );
    } else {
      qb.andWhere('c.specialtyId IS NULL AND u.targetSpecialtyId IS NULL');
    }
    const [users, count] = await qb
      .orderBy('u.onboardingCompletedAt', 'DESC')
      .take(take)
      .getManyAndCount();
    return { users, count };
  }
}
