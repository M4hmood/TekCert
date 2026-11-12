import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  LEADERBOARD_CHANGE_DAYS,
  type LeaderboardPeriod,
  type LeaderboardQuery,
  periodLabel,
  periodStart,
  type Specialty,
  type SpecialtyCode,
  type SpecialtyLeaderboard,
  type StudentLeaderboard,
  type Year,
} from '@tekcert/types';
import { CertificationsService } from '../certifications/certifications.service';
import { communityFilterFor } from '../certifications/utils/community-filter';
import { CLOCK, type Clock } from '../common/utils/clock';
import { type PeriodTotal, PointsService } from '../progress/points.service';
import { pickCurrent } from '../progress/utils/path-summary';
import { type RankableStudent, type UserWithEnrolment, UsersService } from '../users/users.service';
import { avatarPath } from '../users/utils/avatar-path';
import { type BoardMember, buildSpecialtyBoard, buildStudentBoard } from './utils/board';

const DAY_MS = 86_400_000;

/**
 * Leaderboards (ADR-022). Nothing is stored: each request sums the ledger over the period and
 * ranks the students of the scope, so the numbers always equal `SUM(delta)`.
 */
@Injectable()
export class LeaderboardService {
  constructor(
    private readonly users: UsersService,
    private readonly points: PointsService,
    private readonly certifications: CertificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async students(viewerId: string, query: LeaderboardQuery): Promise<StudentLeaderboard> {
    const viewer = await this.viewer(viewerId);
    const now = this.clock.now();
    const head = {
      scope: query.scope,
      period: query.period,
      periodLabel: periodLabel(query.period, now),
      viewer: {
        classCode: viewer.class?.code ?? null,
        year: (viewer.class?.year ?? null) as Year | null,
        specialty: pathSpecialty(viewer),
      },
    };
    const scope = communityFilterFor(viewer, { scope: query.scope });
    // No class saved yet: the scope can't apply.
    if (!scope) return { ...head, total: 0, rows: [], me: null };
    const { excludeUserId: _viewer, ...filter } = scope;

    const [members, totals, inProgress] = await Promise.all([
      this.users.findRankable(filter),
      this.totals(query.period, now),
      this.certifications.inProgress(viewerId),
    ]);
    const board = buildStudentBoard({
      members: members.map(toBoardMember),
      viewerId,
      current: totals.current,
      previous: totals.previous,
    });
    const current = pickCurrent(inProgress);
    return {
      ...head,
      total: board.total,
      rows: board.rows,
      me: board.me && {
        ...board.me,
        continue: current ? { slug: current.slug, code: current.code } : null,
      },
    };
  }

  /** Average points per student and per specialty, all years (ING-1 to 3 by target specialty). */
  async specialties(viewerId: string, period: LeaderboardPeriod): Promise<SpecialtyLeaderboard> {
    const viewer = await this.viewer(viewerId);
    const now = this.clock.now();
    const [members, current] = await Promise.all([
      this.users.findRankable({}),
      this.points.totalsBetween(periodStart(period, now), null),
    ]);
    return {
      period,
      periodLabel: periodLabel(period, now),
      items: buildSpecialtyBoard({
        students: members.map((member) => ({
          id: member.id,
          specialty: specialty(member.specialty ?? member.targetSpecialty),
        })),
        current,
        mine: pathSpecialty(viewer),
      }),
    };
  }

  private async viewer(id: string): Promise<UserWithEnrolment> {
    const viewer = await this.users.findWithEnrolment(id);
    if (!viewer) throw new UnauthorizedException();
    return viewer;
  }

  /**
   * The period's totals now and a week ago. A period that began less than a week ago has no
   * "week ago": everyone was at zero, so a change would mean nothing.
   */
  private async totals(
    period: LeaderboardPeriod,
    now: Date,
  ): Promise<{ current: Map<string, PeriodTotal>; previous: Map<string, PeriodTotal> | null }> {
    const from = periodStart(period, now);
    const weekAgo = new Date(now.getTime() - LEADERBOARD_CHANGE_DAYS * DAY_MS);
    const [current, previous] = await Promise.all([
      this.points.totalsBetween(from, null),
      from && weekAgo <= from ? null : this.points.totalsBetween(from, weekAgo),
    ]);
    return { current, previous };
  }
}

function toBoardMember(member: RankableStudent): BoardMember {
  return {
    person: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarPath: avatarPath(member.id, member.avatarKey),
      classCode: member.classCode,
      year: member.year as Year,
      specialty: (member.specialty?.code ?? null) as SpecialtyCode | null,
    },
    visible: member.leaderboardVisible,
  };
}

function pathSpecialty(viewer: UserWithEnrolment): SpecialtyCode | null {
  return (viewer.class?.specialty?.code ??
    viewer.targetSpecialty?.code ??
    null) as SpecialtyCode | null;
}

function specialty(found: RankableStudent['specialty']): Specialty | null {
  return found && { code: found.code as SpecialtyCode, name: found.name, hue: found.hue };
}
