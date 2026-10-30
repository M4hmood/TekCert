import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  AUTH_PROBLEM,
  classCodeFor,
  type EnrolmentInput,
  GroupSchema,
  ONBOARDING_PROBLEM,
  ONBOARDING_STEP,
  type OnboardingState,
  type PrivacyInput,
  type RecommendedPath,
  type SavedEnrolment,
  SPECIALTY_CODES,
  SpecialtyCodeSchema,
  type SpecialtyOption,
  YearSchema,
} from '@tekcert/types';
import { type DataSource, In, type Repository } from 'typeorm';
import { avatarPath } from '../avatars/avatar-image';
import { CLOCK, type Clock } from '../common/clock';
import { ProblemException } from '../common/problem.exception';
import {
  Certification,
  Path,
  type PathNode,
  SchoolClass,
  Specialty,
  User,
  UserCertification,
} from '../database/entities';
import { initialsOf, type PathNodeInput, selectTrack } from './recommended-path';

/** The shared path for ING-1…3 students who haven't chosen a specialty yet. */
const FUNDAMENTALS_PATH = 'FOND';

/** Moves the saved step forward, never back (Back in the wizard doesn't undo progress). */
const advanceTo = (step: number) => () => `GREATEST("onboarding_step", ${step})`;

type LoadedUser = User & { class: (SchoolClass & { specialty: Specialty | null }) | null };

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Specialty) private readonly specialties: Repository<Specialty>,
    @InjectRepository(Certification) private readonly certifications: Repository<Certification>,
    @InjectRepository(UserCertification)
    private readonly userCertifications: Repository<UserCertification>,
    @InjectRepository(Path) private readonly paths: Repository<Path>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async state(userId: string): Promise<OnboardingState> {
    const user = await this.loadUser(userId);
    const [enrolment, held, specialties] = await Promise.all([
      this.savedEnrolment(user),
      this.heldCertifications(userId),
      this.specialtyOptions(),
    ]);
    return {
      step: user.onboardingStep,
      completed: user.onboardingCompletedAt !== null,
      firstName: user.firstName,
      lastName: user.lastName,
      enrolment,
      certificationSlugs: held.map((cert) => cert.slug),
      leaderboardVisible: user.leaderboardVisible,
      avatarPath: avatarPath(user.id, user.avatarKey),
      specialties,
    };
  }

  /** Step 2: places the student in a seeded class (and, in ING-1…3, records the target). */
  async saveEnrolment(userId: string, input: EnrolmentInput): Promise<OnboardingState> {
    const code = classCodeFor(input);
    const schoolClass = await this.classes.findOneBy({ code });
    if (!schoolClass) {
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.unknownClass,
        title: 'Unknown class',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: `There is no class ${code}.`,
      });
    }
    const target =
      'targetSpecialty' in input && input.targetSpecialty
        ? await this.specialties.findOneByOrFail({ code: input.targetSpecialty })
        : null;
    await this.users.update(
      { id: userId },
      {
        classId: schoolClass.id,
        targetSpecialtyId: target?.id ?? null,
        onboardingStep: advanceTo(ONBOARDING_STEP.certifications),
      },
    );
    return this.state(userId);
  }

  /**
   * Step 3: replaces the certifications declared during onboarding. They stay unverified and
   * earn no points until proof upload and staff review exist (Release 2).
   */
  async saveCertifications(userId: string, slugs: string[]): Promise<OnboardingState> {
    await this.requireEnrolment(userId);
    const found = slugs.length
      ? await this.certifications.find({
          where: { slug: In(slugs), isActive: true },
          select: { id: true, slug: true },
        })
      : [];
    if (found.length !== slugs.length) {
      const known = new Set(found.map((cert) => cert.slug));
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.unknownCertification,
        title: 'Unknown certification',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: `Not in the catalog: ${slugs.filter((slug) => !known.has(slug)).join(', ')}.`,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserCertification, {
        userId,
        source: 'onboarding',
        status: 'unverified',
      });
      if (found.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(UserCertification)
          .values(
            found.map((cert) => ({
              userId,
              certificationId: cert.id,
              source: 'onboarding' as const,
              status: 'unverified' as const,
            })),
          )
          // A certification already recorded another way keeps that record.
          .orIgnore()
          .execute();
      }
      await manager.update(
        User,
        { id: userId },
        { onboardingStep: advanceTo(ONBOARDING_STEP.photo) },
      );
    });
    return this.state(userId);
  }

  /** Step 4. Profiles are always visible; only the leaderboards are opt-out. */
  async savePrivacy(userId: string, input: PrivacyInput): Promise<OnboardingState> {
    await this.requireEnrolment(userId);
    await this.users.update(
      { id: userId },
      {
        leaderboardVisible: input.leaderboardVisible,
        onboardingStep: advanceTo(ONBOARDING_STEP.result),
      },
    );
    return this.state(userId);
  }

  /** "Go to my dashboard": from now on the app no longer sends the student to onboarding. */
  async complete(userId: string): Promise<OnboardingState> {
    const user = await this.requireEnrolment(userId);
    if (!user.onboardingCompletedAt) {
      await this.users.update(
        { id: userId },
        { onboardingCompletedAt: this.clock.now(), onboardingStep: ONBOARDING_STEP.result },
      );
    }
    return this.state(userId);
  }

  /**
   * ING-4/5: the specialty's path. ING-1…3: the target specialty's path, or Fundamentals when
   * undecided.
   */
  async recommendedPath(userId: string): Promise<RecommendedPath> {
    const user = await this.requireEnrolment(userId);
    const specialtyId = user.class.specialtyId ?? user.targetSpecialtyId;
    const reason = user.class.specialtyId ? 'specialty' : specialtyId ? 'target' : 'undecided';

    const path = await this.paths.findOne({
      where: specialtyId ? { specialtyId } : { code: FUNDAMENTALS_PATH },
      relations: { specialty: true, nodes: { certification: true, prerequisite: true } },
    });
    if (!path) throw new NotFoundException('No path is seeded for this specialty');

    const [held, peers] = await Promise.all([
      this.heldCertifications(userId),
      this.peers(userId, specialtyId),
    ]);
    return {
      path: { code: path.code, name: path.name, hue: path.specialty?.hue ?? null },
      reason,
      track: selectTrack(path.nodes.map(toNodeInput), new Set(held.map((cert) => cert.code))),
      certificationCount: path.nodes.length,
      peers,
    };
  }

  private async loadUser(userId: string): Promise<LoadedUser> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { class: { specialty: true }, targetSpecialty: true },
    });
    if (!user) {
      throw new ProblemException({
        type: AUTH_PROBLEM.unauthenticated,
        title: 'Sign in required',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    return user as LoadedUser;
  }

  /** Steps 3–5 need the class: later sprints rank and group students by it. */
  private async requireEnrolment(
    userId: string,
  ): Promise<LoadedUser & { class: NonNullable<LoadedUser['class']> }> {
    const user = await this.loadUser(userId);
    if (!user.class) {
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.enrolmentRequired,
        title: 'Choose your year and class first',
        status: HttpStatus.CONFLICT,
        detail: 'Onboarding step 2 (year, specialty and group) is not saved yet.',
      });
    }
    return user as LoadedUser & { class: NonNullable<LoadedUser['class']> };
  }

  private async savedEnrolment(user: LoadedUser): Promise<SavedEnrolment | null> {
    if (!user.class) return null;
    return {
      year: YearSchema.parse(user.class.year),
      group: GroupSchema.parse(user.class.group),
      specialty: user.class.specialty ? SpecialtyCodeSchema.parse(user.class.specialty.code) : null,
      targetSpecialty: user.targetSpecialty
        ? SpecialtyCodeSchema.parse(user.targetSpecialty.code)
        : null,
      classCode: user.class.code,
      classmates: await this.users.countBy({ classId: user.class.id }),
    };
  }

  private async heldCertifications(userId: string): Promise<{ code: string; slug: string }[]> {
    const rows = await this.userCertifications.find({
      where: { userId },
      relations: { certification: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({ code: row.certification.code, slug: row.certification.slug }));
  }

  /** The six specialties in design order, each with the first track of its path as a preview. */
  private async specialtyOptions(): Promise<SpecialtyOption[]> {
    const [specialties, paths] = await Promise.all([
      this.specialties.find(),
      this.paths.find({ relations: { nodes: { certification: true } } }),
    ]);
    const options = specialties.map((specialty) => {
      const path = paths.find((p) => p.specialtyId === specialty.id);
      const preview = (path?.nodes ?? [])
        .filter((node) => node.row === 0)
        .sort((a, b) => a.col - b.col)
        .map((node) => node.certification.code);
      return {
        code: SpecialtyCodeSchema.parse(specialty.code),
        name: specialty.name,
        hue: specialty.hue,
        pathPreview: preview,
      };
    });
    return options.sort(
      (a, b) => SPECIALTY_CODES.indexOf(a.code) - SPECIALTY_CODES.indexOf(b.code),
    );
  }

  /** Other onboarded students recommended the same path (their profiles are visible to all). */
  private async peers(
    userId: string,
    specialtyId: string | null,
  ): Promise<RecommendedPath['peers']> {
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
    const [recent, count] = await qb
      .orderBy('u.onboardingCompletedAt', 'DESC')
      .take(3)
      .getManyAndCount();
    return { count, initials: recent.map((peer) => initialsOf(peer.firstName, peer.lastName)) };
  }
}

function toNodeInput(node: PathNode): PathNodeInput {
  return {
    code: node.certification.code,
    slug: node.certification.slug,
    name: node.certification.name,
    level: node.certification.level,
    col: node.col,
    row: node.row,
    prerequisiteCode: node.prerequisite?.code ?? null,
  };
}
