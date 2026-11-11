import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  type CommunitySpecialtyFilter,
  type Directory,
  DIRECTORY_HELD_CHIPS,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_PREPARING_CHIPS,
  type DirectoryPerson,
  type DirectoryQuery,
  levelBadgeFor,
  type MyProfileSettings,
  percentDone,
  PROFILE_ACTIVITY_LIMIT,
  type ProfilePath,
  type Specialty,
  type SpecialtyCode,
  type StudentProfile,
  type Year,
} from '@tekcert/types';
import {
  type CertificationCard,
  CertificationsService,
} from '../certifications/certifications.service';
import { communityFilterFor } from '../certifications/utils/community-filter';
import { PathsService } from '../paths/paths.service';
import { ActivityService } from '../progress/activity.service';
import { PointsService } from '../progress/points.service';
import type { Specialty as SpecialtyEntity } from '../school/entities/specialty.entity';
import {
  type CommunityMember,
  type DirectoryFilter,
  type ProfileMember,
  type UserWithEnrolment,
  UsersService,
} from '../users/users.service';
import { avatarPath } from '../users/utils/avatar-path';

/**
 * The directory and the student profiles (ADR-021). It owns no table: everything is read
 * through the services of the modules that do.
 *
 * Privacy: only students with a verified email who finished onboarding are listed or opened,
 * and nothing here says which chapters a student ticked.
 */
@Injectable()
export class CommunityService {
  constructor(
    private readonly users: UsersService,
    private readonly certifications: CertificationsService,
    private readonly points: PointsService,
    private readonly activity: ActivityService,
    private readonly paths: PathsService,
  ) {}

  async directory(viewerId: string, query: DirectoryQuery): Promise<Directory> {
    const viewer = await this.users.findWithEnrolment(viewerId);
    if (!viewer) throw new UnauthorizedException();
    const page = {
      page: query.page,
      pageSize: DIRECTORY_PAGE_SIZE,
      viewer: {
        classCode: viewer.class?.code ?? null,
        year: (viewer.class?.year ?? null) as Year | null,
        specialty: (viewer.class?.specialty?.code ??
          viewer.targetSpecialty?.code ??
          null) as SpecialtyCode | null,
      },
    };
    const filter = await this.filterFor(viewer, query);
    if (!filter) return { ...page, total: 0, items: [], specialties: [] };

    const [{ members, total }, bySpecialty] = await Promise.all([
      this.users.findDirectoryPage(
        filter,
        (query.page - 1) * DIRECTORY_PAGE_SIZE,
        DIRECTORY_PAGE_SIZE,
      ),
      this.users.countDirectoryBySpecialty(filter),
    ]);
    const ids = members.map((member) => member.id);
    const [portfolios, totals] = await Promise.all([
      this.certifications.portfolios(ids),
      this.points.totals(ids),
    ]);

    const items = members.map((member): DirectoryPerson => {
      const portfolio = portfolios.get(member.id) ?? { held: [], preparing: [] };
      const points = totals.get(member.id) ?? 0;
      const isMe = member.id === viewerId;
      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        avatarPath: avatarPath(member.id, member.avatarKey),
        classCode: member.class.code,
        year: member.class.year as Year,
        specialty: (member.class.specialty?.code ?? null) as SpecialtyCode | null,
        availableToHelp: member.availableToHelp,
        isMe,
        held: portfolio.held.slice(0, DIRECTORY_HELD_CHIPS),
        preparing: portfolio.preparing.slice(0, DIRECTORY_PREPARING_CHIPS),
        earnedCount: portfolio.held.length,
        preparingCount: portfolio.preparing.length,
        level: levelBadgeFor(points),
        points: pointsVisible(member, isMe) ? points : null,
      };
    });
    return {
      ...page,
      total,
      items,
      specialties: bySpecialty
        .map(({ code, count }) => ({
          code: (code ?? 'none') as CommunitySpecialtyFilter,
          count,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
  }

  /** 404 for an unknown id and for a student who can't be shown yet, with the same answer. */
  async profile(viewerId: string, studentId: string): Promise<StudentProfile> {
    const member = await this.users.findProfileMember(studentId);
    if (!member) throw new NotFoundException('Student not found');
    const isMe = member.id === viewerId;

    const [held, inProgress, summary, chaptersDone, activity, path] = await Promise.all([
      this.certifications.held(member.id),
      this.certifications.inProgress(member.id),
      this.points.summary(member.id),
      this.certifications.completedChapterCount(member.id),
      this.activity.recentOf(member.id, PROFILE_ACTIVITY_LIMIT),
      this.pathOf(member),
    ]);
    const showPoints = pointsVisible(member, isMe);
    const heldIds = new Set(held.map((cert) => cert.id));

    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarPath: avatarPath(member.id, member.avatarKey),
      classCode: member.class.code,
      year: member.class.year as Year,
      specialty: specialty(member.class.specialty),
      targetSpecialty: member.class.specialty ? null : specialty(member.targetSpecialty),
      email: member.email,
      availableToHelp: member.availableToHelp,
      isMe,
      level: levelBadgeFor(summary.points),
      points: showPoints ? summary.points : null,
      stats: {
        unverified: held.length,
        preparing: inProgress.length,
        chaptersDone: showPoints ? chaptersDone : null,
        badges: summary.badges.filter((badge) => badge.earnedAt).length,
      },
      collection: held.map((cert) => ({
        ...card(cert),
        status: 'unverified' as const,
        since: cert.since.toISOString(),
      })),
      preparing: inProgress
        .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
        .map((cert) => ({
          ...card(cert),
          pct: percentDone(cert.done, cert.chapterCount),
          // Classmates see a percentage, never the chapters.
          done: isMe ? cert.done : null,
          total: isMe ? cert.chapterCount : null,
        })),
      path: path && {
        ...path.summary,
        heldCount: path.certificationIds.filter((id) => heldIds.has(id)).length,
      },
      badges: summary.badges,
      activity,
      privacy: isMe ? { leaderboardVisible: member.leaderboardVisible } : null,
    };
  }

  async updateMine(userId: string, changes: MyProfileSettings): Promise<MyProfileSettings> {
    await this.users.setAvailableToHelp(userId, changes.availableToHelp);
    return { availableToHelp: changes.availableToHelp };
  }

  /** Null when the scope can't apply (no class saved yet): nobody is listed. */
  private async filterFor(
    viewer: UserWithEnrolment,
    query: DirectoryQuery,
  ): Promise<DirectoryFilter | null> {
    const scope = communityFilterFor(viewer, { scope: query.scope, specialty: query.specialty });
    if (!scope) return null;
    // "Who to ask" never lists the student asking; the directory does.
    const { excludeUserId: viewerId, ...scoped } = scope;
    const [orUserIds, onlyUserIds] = await Promise.all([
      query.q ? this.certifications.userIdsMatching(query.q) : undefined,
      query.holds ? this.certifications.holderIdsBySlug(query.holds) : undefined,
    ]);
    return {
      ...scoped,
      viewerId,
      name: query.q,
      orUserIds,
      onlyUserIds,
      availableToHelp: query.help,
    };
  }

  /** The student's own path: class specialty, the one they aim for, or Fundamentals. */
  private async pathOf(
    member: ProfileMember,
  ): Promise<{ summary: Omit<ProfilePath, 'heldCount'>; certificationIds: string[] } | null> {
    const specialtyId = member.class.specialtyId ?? member.targetSpecialtyId ?? null;
    const path = await this.paths.findForSpecialty(specialtyId);
    if (!path) return null;
    const certificationIds = path.nodes
      .filter((node) => node.certification.isActive)
      .map((node) => node.certificationId);
    return {
      summary: {
        code: path.code,
        name: path.name,
        kind: member.class.specialtyId
          ? 'specialty'
          : member.targetSpecialtyId
            ? 'target'
            : 'fundamentals',
        total: certificationIds.length,
      },
      certificationIds,
    };
  }
}

/**
 * A student who hides their name on the leaderboard keeps their points to themselves: shown
 * elsewhere, the points would give away which "Anonymous" row is theirs.
 */
function pointsVisible(member: CommunityMember, isMe: boolean): boolean {
  return isMe || member.leaderboardVisible;
}

function specialty(entity: SpecialtyEntity | null): Specialty | null {
  return entity && { code: entity.code as SpecialtyCode, name: entity.name, hue: entity.hue };
}

function card(cert: CertificationCard) {
  return {
    slug: cert.slug,
    code: cert.code,
    name: cert.name,
    provider: cert.provider,
    badgeAsset: cert.badgeAsset,
  };
}
