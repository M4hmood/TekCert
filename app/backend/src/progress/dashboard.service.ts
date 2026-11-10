import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  type Dashboard,
  type DashboardNext,
  type DashboardPath,
  type DashboardPerson,
  percentDone,
  type SpecialtyCode,
} from '@tekcert/types';
import {
  type CertificationCard,
  CertificationsService,
} from '../certifications/certifications.service';
import { PathsService } from '../paths/paths.service';
import { avatarPath } from '../users/utils/avatar-path';
import { type CommunityFilter, type UserWithEnrolment, UsersService } from '../users/users.service';
import { PointsService } from './points.service';
import { groupLabel } from './utils/labels';
import { pickCurrent, summarizePath, type SummarizedNode } from './utils/path-summary';

/** "Also preparing" and "your class has already started" show this many people. */
const ALSO_PREPARING_LIMIT = 4;
const GROUP_PREVIEW = 3;

type Enrolled = UserWithEnrolment & { class: NonNullable<UserWithEnrolment['class']> };

/** Everything the dashboard shows except the activity feed, which has its own scope switch. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly certifications: CertificationsService,
    private readonly points: PointsService,
    private readonly paths: PathsService,
    private readonly users: UsersService,
  ) {}

  async forUser(userId: string): Promise<Dashboard> {
    const viewer = await this.users.findWithEnrolment(userId);
    if (!viewer) throw new UnauthorizedException();

    const [summary, inProgress, heldIds] = await Promise.all([
      this.points.summary(userId),
      this.certifications.inProgress(userId),
      this.certifications.heldIds(userId),
    ]);
    const currentEntry = pickCurrent(inProgress);
    const empty = !currentEntry && summary.points === 0;
    const enrolled = viewer.class ? (viewer as Enrolled) : null;

    const [current, pathPart, alsoPreparing, groupStarted] = await Promise.all([
      currentEntry ? this.currentOf(userId, currentEntry) : null,
      this.pathOf(viewer, new Set(heldIds), new Set(inProgress.map((entry) => entry.id)), enrolled),
      currentEntry ? this.alsoPreparing(userId, currentEntry.slug) : { total: 0, items: [] },
      empty && enrolled ? this.groupStarted(enrolled) : { total: 0, items: [] },
    ]);

    return {
      firstName: viewer.firstName,
      group: enrolled ? groupLabel(enrolled.class.year, enrolled.class.specialty?.code) : null,
      specialty: (viewer.class?.specialty?.code ??
        viewer.targetSpecialty?.code ??
        null) as SpecialtyCode | null,
      points: summary.points,
      level: summary.level,
      badges: summary.badges,
      current,
      next: pathPart.next,
      path: pathPart.path,
      alsoPreparing,
      groupStarted,
      empty,
    };
  }

  private async currentOf(
    userId: string,
    entry: Awaited<ReturnType<CertificationsService['inProgress']>>[number],
  ): Promise<Dashboard['current']> {
    const chapters = await this.certifications.syllabus(userId, entry.id);
    const done = chapters.filter((chapter) => chapter.done).length;
    const total = chapters.length;
    return {
      ...card(entry),
      startedAt: entry.startedAt.toISOString(),
      done,
      total,
      pct: percentDone(done, total),
      chapters,
    };
  }

  /**
   * My path (class specialty, the one I aim for, or Fundamentals) and the next certification on
   * it. Holders of the next one are counted in my year and specialty.
   */
  private async pathOf(
    viewer: UserWithEnrolment,
    held: Set<string>,
    inProgress: Set<string>,
    enrolled: Enrolled | null,
  ): Promise<{ path: DashboardPath | null; next: DashboardNext | null }> {
    const specialtyId = viewer.class?.specialtyId ?? viewer.targetSpecialtyId ?? null;
    const path = await this.paths.findForSpecialty(specialtyId);
    if (!path) return { path: null, next: null };

    const summary = summarizePath(
      path.nodes.map((node) => ({
        certificationId: node.certificationId,
        code: node.certification.code,
        slug: node.certification.slug,
        col: node.col,
        row: node.row,
        isActive: node.certification.isActive,
        prerequisiteId: node.prerequisiteId,
        prerequisiteCode: node.prerequisite?.code ?? null,
      })),
      held,
      inProgress,
    );
    return {
      path: {
        code: path.code,
        name: path.name,
        kind: viewer.class?.specialtyId
          ? 'specialty'
          : viewer.targetSpecialtyId
            ? 'target'
            : 'fundamentals',
        heldCount: summary.heldCount,
        nodes: summary.nodes.map(({ code, slug, state }) => ({ code, slug, state })),
      },
      next: summary.next ? await this.nextOf(viewer, summary.next, enrolled) : null,
    };
  }

  private async nextOf(
    viewer: UserWithEnrolment,
    node: SummarizedNode,
    enrolled: Enrolled | null,
  ): Promise<DashboardNext | null> {
    const [cards, holderIds] = await Promise.all([
      this.certifications.cards([node.certificationId]),
      this.certifications.holderIds(node.certificationId),
    ]);
    const next = cards.get(node.certificationId);
    if (!next) return null;
    const holders = enrolled
      ? await this.users.findCommunityMembers(holderIds, groupFilter(enrolled))
      : [];
    return {
      ...card(next),
      chapterCount: next.chapterCount,
      studyMinutes: next.studyMinutes,
      after: node.prerequisiteCode,
      earnedInGroup: holders.length,
    };
  }

  /** Students of my specialty, all years, preparing the same certification, furthest first. */
  private async alsoPreparing(userId: string, slug: string): Promise<Dashboard['alsoPreparing']> {
    const { preparing } = await this.certifications.community(userId, slug, {
      scope: 'specialty',
    });
    const items = [...preparing.items]
      .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || a.lastName.localeCompare(b.lastName))
      .slice(0, ALSO_PREPARING_LIMIT)
      .map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        avatarPath: person.avatarPath,
        group: groupLabel(person.year, person.specialty),
        pct: person.pct ?? 0,
      }));
    return { total: preparing.total, items };
  }

  /** Empty state: students of my year and specialty who hold or prepare a certification. */
  private async groupStarted(viewer: Enrolled): Promise<Dashboard['groupStarted']> {
    const ids = await this.certifications.engagedUserIds();
    const members = await this.users.findCommunityMembers(ids, groupFilter(viewer));
    const items: DashboardPerson[] = members.slice(0, GROUP_PREVIEW).map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarPath: avatarPath(member.id, member.avatarKey),
      group: groupLabel(member.class.year, member.class.specialty?.code),
    }));
    return { total: members.length, items };
  }
}

/** My year and class specialty ("ING-4 CIM"); ING-1…3 have none. */
function groupFilter(viewer: Enrolled): CommunityFilter {
  return {
    excludeUserId: viewer.id,
    year: viewer.class.year,
    classSpecialty: viewer.class.specialty?.code ?? 'none',
  };
}

function card(cert: CertificationCard) {
  return {
    slug: cert.slug,
    code: cert.code,
    name: cert.name,
    level: cert.level,
    provider: cert.provider,
    badgeAsset: cert.badgeAsset,
  };
}
