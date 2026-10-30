import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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
import type { DataSource } from 'typeorm';
import { CertificationsService } from '../certifications/certifications.service';
import { UserCertificationsService } from '../certifications/user-certifications.service';
import { ProblemException } from '../common/exceptions/problem.exception';
import { CLOCK, type Clock } from '../common/utils/clock';
import type { PathNode } from '../paths/entities/path-node.entity';
import { PathsService } from '../paths/paths.service';
import { SchoolService } from '../school/school.service';
import { avatarPath } from '../users/utils/avatar-path';
import { type UserWithEnrolment, UsersService } from '../users/users.service';
import { initialsOf, type PathNodeInput, selectTrack } from './utils/recommended-path';

/** How many peers' initials the result screen shows. */
const PEER_PREVIEW = 3;

type EnrolledUser = UserWithEnrolment & { class: NonNullable<UserWithEnrolment['class']> };

@Injectable()
export class OnboardingService {
  constructor(
    private readonly users: UsersService,
    private readonly school: SchoolService,
    private readonly certifications: CertificationsService,
    private readonly userCertifications: UserCertificationsService,
    private readonly paths: PathsService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async state(userId: string): Promise<OnboardingState> {
    const user = await this.loadUser(userId);
    const [enrolment, held, specialties] = await Promise.all([
      this.savedEnrolment(user),
      this.userCertifications.heldBy(userId),
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
    const schoolClass = await this.school.findClassByCode(code);
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
        ? await this.school.getSpecialtyByCode(input.targetSpecialty)
        : null;
    await this.users.advanceOnboarding(userId, ONBOARDING_STEP.certifications, {
      classId: schoolClass.id,
      targetSpecialtyId: target?.id ?? null,
    });
    return this.state(userId);
  }

  /**
   * Step 3: replaces the certifications declared during onboarding. They stay unverified and
   * earn no points until proof upload and staff review exist (Release 2).
   */
  async saveCertifications(userId: string, slugs: string[]): Promise<OnboardingState> {
    await this.requireEnrolment(userId);
    const found = await this.certifications.findActiveBySlugs(slugs);
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
      await this.userCertifications.replaceOnboardingDeclarations(
        userId,
        found.map((cert) => cert.id),
        manager,
      );
      await this.users.advanceOnboarding(userId, ONBOARDING_STEP.photo, {}, manager);
    });
    return this.state(userId);
  }

  /** Step 4. Profiles are always visible; only the leaderboards are opt-out. */
  async savePrivacy(userId: string, input: PrivacyInput): Promise<OnboardingState> {
    await this.requireEnrolment(userId);
    await this.users.advanceOnboarding(userId, ONBOARDING_STEP.result, {
      leaderboardVisible: input.leaderboardVisible,
    });
    return this.state(userId);
  }

  /** "Go to my dashboard": from now on the app no longer sends the student to onboarding. */
  async complete(userId: string): Promise<OnboardingState> {
    const user = await this.requireEnrolment(userId);
    if (!user.onboardingCompletedAt) {
      await this.users.completeOnboarding(userId, this.clock.now(), ONBOARDING_STEP.result);
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

    const path = await this.paths.findForSpecialty(specialtyId);
    if (!path) throw new NotFoundException('No path is seeded for this specialty');

    const [held, peers] = await Promise.all([
      this.userCertifications.heldBy(userId),
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

  private async loadUser(userId: string): Promise<UserWithEnrolment> {
    const user = await this.users.findWithEnrolment(userId);
    if (!user) {
      throw new ProblemException({
        type: AUTH_PROBLEM.unauthenticated,
        title: 'Sign in required',
        status: HttpStatus.UNAUTHORIZED,
      });
    }
    return user;
  }

  /** Steps 3–5 need the class: later sprints rank and group students by it. */
  private async requireEnrolment(userId: string): Promise<EnrolledUser> {
    const user = await this.loadUser(userId);
    if (!user.class) {
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.enrolmentRequired,
        title: 'Choose your year and class first',
        status: HttpStatus.CONFLICT,
        detail: 'Onboarding step 2 (year, specialty and group) is not saved yet.',
      });
    }
    return user as EnrolledUser;
  }

  private async savedEnrolment(user: UserWithEnrolment): Promise<SavedEnrolment | null> {
    if (!user.class) return null;
    return {
      year: YearSchema.parse(user.class.year),
      group: GroupSchema.parse(user.class.group),
      specialty: user.class.specialty ? SpecialtyCodeSchema.parse(user.class.specialty.code) : null,
      targetSpecialty: user.targetSpecialty
        ? SpecialtyCodeSchema.parse(user.targetSpecialty.code)
        : null,
      classCode: user.class.code,
      classmates: await this.users.countInClass(user.class.id),
    };
  }

  /** The six specialties in design order, each with the first track of its path as a preview. */
  private async specialtyOptions(): Promise<SpecialtyOption[]> {
    const [specialties, paths] = await Promise.all([
      this.school.listSpecialties(),
      this.paths.listWithNodes(),
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
    const { users, count } = await this.users.findOnboardedPeers(userId, specialtyId, PEER_PREVIEW);
    return { count, initials: users.map((peer) => initialsOf(peer.firstName, peer.lastName)) };
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
