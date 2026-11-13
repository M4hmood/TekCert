import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type AcademicYearAnswer,
  academicYearLabel,
  academicYearOf,
  AUTH_PROBLEM,
  type EnrolmentInput,
  isYearPromptDue,
  nextEnrolment,
  ONBOARDING_PROBLEM,
  type Settings,
  SETTINGS_PROBLEM,
  SPECIALTY_CODES,
  SpecialtyCodeSchema,
  type UpdateAccountInput,
  type UpdatePreferencesInput,
} from '@tekcert/types';
import { CertificationsService } from '../certifications/certifications.service';
import { ProblemException } from '../common/exceptions/problem.exception';
import { CLOCK, type Clock } from '../common/utils/clock';
import { PointsService } from '../progress/points.service';
import { SchoolService } from '../school/school.service';
import { type UserWithEnrolment, UsersService } from '../users/users.service';
import { toSavedEnrolment } from '../users/utils/saved-enrolment';
import { buildExport } from './utils/export';

/**
 * A student's own settings: account, enrolment, theme and the yearly "where are you now?"
 * answer (ADR-023). It owns no table and only ever touches the account of the student asking.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly users: UsersService,
    private readonly school: SchoolService,
    private readonly certifications: CertificationsService,
    private readonly points: PointsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async get(userId: string): Promise<Settings> {
    const user = await this.load(userId);
    const now = this.clock.now();
    const year = academicYearOf(now);
    const [classmates, specialties] = await Promise.all([
      user.class ? this.users.countInClass(user.class.id) : 0,
      this.school.listSpecialties(),
    ]);
    return {
      account: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      enrolment: toSavedEnrolment(user, classmates),
      alumni: user.alumniSince !== null,
      privacy: {
        leaderboardVisible: user.leaderboardVisible,
        availableToHelp: user.availableToHelp,
      },
      theme: user.theme,
      academicYear: {
        year,
        label: academicYearLabel(year),
        due: isYearPromptDue(promptState(user), now),
      },
      specialties: specialties
        .map((specialty) => ({
          code: SpecialtyCodeSchema.parse(specialty.code),
          name: specialty.name,
          hue: specialty.hue,
        }))
        .sort((a, b) => SPECIALTY_CODES.indexOf(a.code) - SPECIALTY_CODES.indexOf(b.code)),
    };
  }

  async updateAccount(userId: string, input: UpdateAccountInput): Promise<Settings> {
    await this.users.updateAccount(userId, {
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return this.get(userId);
  }

  async setPreferences(userId: string, input: UpdatePreferencesInput): Promise<Settings> {
    await this.users.updateAccount(userId, { theme: input.theme });
    return this.get(userId);
  }

  /**
   * Saving a class says where the student is now: it confirms the current academic year and
   * ends alumni mode. The leaderboards follow at once; the points ledger isn't touched.
   */
  async saveEnrolment(userId: string, input: EnrolmentInput): Promise<Settings> {
    await this.requireClass(userId);
    await this.users.updateAccount(userId, {
      ...(await this.school.resolveEnrolment(input)),
      enrolmentConfirmedYear: academicYearOf(this.clock.now()),
      alumniSince: null,
    });
    return this.get(userId);
  }

  /** The answer to "Where are you this year?". */
  async answerAcademicYear(userId: string, answer: AcademicYearAnswer): Promise<Settings> {
    const user = await this.requireClass(userId);
    const now = this.clock.now();
    const confirmed = { enrolmentConfirmedYear: academicYearOf(now) };

    if (answer.status === 'left') {
      await this.users.updateAccount(userId, {
        ...confirmed,
        alumniSince: user.alumniSince ?? now,
      });
      return this.get(userId);
    }
    if (answer.status === 'repeating') {
      await this.users.updateAccount(userId, { ...confirmed, alumniSince: null });
      return this.get(userId);
    }

    // Moving up changes the class, so it is accepted once a year: a second click, or a second
    // tab, must not move the student up twice.
    if (!isYearPromptDue(promptState(user), now)) {
      throw new ProblemException({
        type: SETTINGS_PROBLEM.yearAlreadyConfirmed,
        title: 'Academic year already confirmed',
        status: HttpStatus.CONFLICT,
        detail: 'Change your class in Settings › Enrolment instead.',
      });
    }
    const current = toSavedEnrolment(user, 0);
    const next = current && nextEnrolment(current, answer);
    if (!next?.ok) {
      const finalYear = next?.reason === 'final_year';
      throw new ProblemException({
        type: finalYear ? SETTINGS_PROBLEM.finalYear : SETTINGS_PROBLEM.specialtyRequired,
        title: finalYear ? 'There is no year after ING-5' : 'Choose your specialty',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: finalYear
          ? 'Answer that you are repeating the year, or that you left TEK-UP.'
          : 'A specialty is needed to move up to ING-4.',
      });
    }
    return this.saveEnrolment(userId, next.enrolment);
  }

  /** Everything TekCert holds about the student's learning, as one CSV file. */
  async exportCsv(userId: string): Promise<string> {
    const user = await this.load(userId);
    const [held, inProgress, chapters, ledger, total] = await Promise.all([
      this.certifications.held(userId),
      this.certifications.inProgress(userId),
      this.certifications.completedChapters(userId),
      this.points.ledgerOf(userId),
      this.points.total(userId),
    ]);
    const [refs, titles] = await Promise.all([
      this.certifications.refs([
        ...new Set([
          ...chapters.map((chapter) => chapter.certificationId),
          ...ledger.flatMap((entry) => entry.certificationId ?? []),
        ]),
      ]),
      this.certifications.chapterTitles([
        ...new Set(ledger.flatMap((entry) => entry.chapterId ?? [])),
      ]),
    ]);
    return buildExport({
      profile: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        classCode: user.class?.code ?? null,
        alumni: user.alumniSince !== null,
        points: total,
        createdAt: user.createdAt,
      },
      held: held.map((cert) => ({ code: cert.code, name: cert.name, since: cert.since })),
      inProgress: inProgress.map((cert) => ({
        code: cert.code,
        name: cert.name,
        done: cert.done,
        total: cert.chapterCount,
        since: cert.startedAt,
      })),
      chapters: chapters.map((chapter) => ({
        code: refs.get(chapter.certificationId)?.code ?? null,
        title: chapter.title,
        at: chapter.completedAt,
      })),
      ledger: ledger.map((entry) => ({
        code: (entry.certificationId && refs.get(entry.certificationId)?.code) || null,
        title: (entry.chapterId && titles.get(entry.chapterId)) || null,
        reason: entry.reason,
        delta: entry.delta,
        at: entry.createdAt,
      })),
    });
  }

  private async load(userId: string): Promise<UserWithEnrolment> {
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

  /** Settings change a class; choosing the first one is onboarding's job. */
  private async requireClass(userId: string): Promise<UserWithEnrolment> {
    const user = await this.load(userId);
    if (!user.class || !user.onboardingCompletedAt) {
      throw new ProblemException({
        type: ONBOARDING_PROBLEM.enrolmentRequired,
        title: 'Finish onboarding first',
        status: HttpStatus.CONFLICT,
        detail: 'Your year and class are chosen in onboarding before they can be changed here.',
      });
    }
    return user;
  }
}

function promptState(user: UserWithEnrolment) {
  return {
    confirmedYear: user.enrolmentConfirmedYear,
    alumni: user.alumniSince !== null,
    onboarded: user.onboardingCompletedAt !== null,
  };
}
