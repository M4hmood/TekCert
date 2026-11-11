import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  catalogFacets,
  CERTIFICATION_PROBLEM,
  type CertificationCommunity,
  type CertificationDetail,
  type CertificationList,
  type CertificationListQuery,
  type CertificationSummary,
  COMMUNITY_LIST_LIMIT,
  type CommunityList,
  type CommunityQuery,
  type DashboardChapter,
  filterCatalog,
  type MyCertification,
  type MyCertificationProgress,
  type MyCertifications,
  percentDone,
  PROGRESS_PROBLEM,
  type SpecialtyCode,
  type Year,
} from '@tekcert/types';
import { type EntityManager, In, type Repository } from 'typeorm';
import { ProblemException } from '../common/exceptions/problem.exception';
import { PathsService } from '../paths/paths.service';
import { UsersService } from '../users/users.service';
import { avatarPath } from '../users/utils/avatar-path';
import { ChapterProgressService } from './chapter-progress.service';
import { Certification } from './entities/certification.entity';
import { PreparationsService } from './preparations.service';
import { UserCertificationsService } from './user-certifications.service';
import { communityFilterFor, newestFirst } from './utils/community-filter';
import { mergeMyCertifications } from './utils/my-certifications';

@Injectable()
export class CertificationsService {
  constructor(
    @InjectRepository(Certification)
    private readonly certifications: Repository<Certification>,
    private readonly userCertifications: UserCertificationsService,
    private readonly preparations: PreparationsService,
    private readonly chapterProgress: ChapterProgressService,
    private readonly paths: PathsService,
    private readonly users: UsersService,
  ) {}

  /**
   * The catalog is small (56 rows), so it is loaded whole and filtered with the same function
   * the web app runs. Facet counts come from the same rows.
   */
  async list(query: CertificationListQuery): Promise<CertificationList> {
    const [rows, earned] = await Promise.all([
      this.certifications.find({
        where: { isActive: true },
        relations: { provider: true, specialties: true },
      }),
      this.userCertifications.countByCertification(),
    ]);
    const all = rows.map((row) => toSummary(row, earned.get(row.id) ?? 0));
    const items = filterCatalog(all, query);
    return { items, total: items.length, facets: catalogFacets(all, query) };
  }

  /** Active certifications among `slugs`; unknown or retired slugs are left out. */
  findActiveBySlugs(slugs: string[]): Promise<Pick<Certification, 'id' | 'slug'>[]> {
    if (!slugs.length) return Promise.resolve([]);
    return this.certifications.find({
      where: { slug: In(slugs), isActive: true },
      select: { id: true, slug: true },
    });
  }

  async findBySlug(slug: string): Promise<CertificationDetail> {
    const row = await this.certifications.findOne({
      where: { slug, isActive: true },
      relations: {
        provider: true,
        specialties: true,
        domains: { chapters: true },
        resources: true,
      },
      order: {
        domains: { order: 'ASC', chapters: { order: 'ASC' } },
        resources: { order: 'ASC' },
      },
    });
    if (!row) throw notFound(slug);
    const [earnedCount, preparingCount, prerequisites] = await Promise.all([
      this.userCertifications.countFor(row.id),
      this.preparations.countFor(row.id),
      this.paths.prerequisitesOf(row.id),
    ]);
    return {
      ...toSummary(row, earnedCount),
      summary: row.summary,
      description: row.description,
      facts: {
        minutes: row.examMinutes,
        questions: row.questionCount,
        passingScore: row.passingScore,
        languages: row.languages,
        delivery: row.delivery,
        validityYears: row.validityYears,
      },
      domains: row.domains.map((domain) => ({
        order: domain.order,
        title: domain.title,
        shortTitle: domain.shortTitle,
        weightPct: domain.weightPct,
        chapters: domain.chapters.map((chapter) => ({
          id: chapter.id,
          order: chapter.order,
          title: chapter.title,
          estimatedMinutes: chapter.estimatedMinutes,
        })),
      })),
      resources: row.resources.map((resource) => ({
        kind: resource.kind,
        title: resource.title,
        url: resource.url,
        source: new URL(resource.url).hostname.replace(/^www\./, ''),
        duration: resource.duration,
      })),
      prerequisites: prerequisites.map((p) => ({ code: p.code, slug: p.slug, name: p.name })),
      preparingCount,
    };
  }

  /** Every certification the student holds or prepares, one status each. */
  async mine(userId: string): Promise<MyCertifications> {
    const [held, preparing, slugs] = await Promise.all([
      this.userCertifications.listForUser(userId),
      this.preparations.listForUser(userId),
      this.activeSlugs(),
    ]);
    return { items: mergeMyCertifications(held, preparing, (id) => slugs.get(id)) };
  }

  /** "Start": the certification is now in progress. 409 when the student already holds it. */
  async start(
    userId: string,
    slug: string,
  ): Promise<MyCertification & { created: boolean; certificationId: string }> {
    const cert = await this.activeBySlug(slug);
    if (await this.userCertifications.holds(userId, cert.id)) {
      throw new ProblemException({
        type: CERTIFICATION_PROBLEM.alreadyHeld,
        title: 'Certification already held',
        status: HttpStatus.CONFLICT,
        detail: `You already hold ${cert.code}.`,
      });
    }
    const { startedAt, created } = await this.preparations.start(userId, cert.id);
    return {
      slug: cert.slug,
      status: 'in_progress',
      since: startedAt.toISOString(),
      created,
      certificationId: cert.id,
    };
  }

  /** "Who to ask": students who hold the certification and students preparing it. */
  async community(
    viewerId: string,
    slug: string,
    query: CommunityQuery,
  ): Promise<CertificationCommunity> {
    const cert = await this.activeBySlug(slug);
    const viewer = await this.users.findWithEnrolment(viewerId);
    const filter = viewer && communityFilterFor(viewer, query);
    if (!filter) return { earned: emptyList(), preparing: emptyList() };

    const [holders, preparers] = await Promise.all([
      this.userCertifications.holdersOf(cert.id),
      this.preparations.preparersOf(cert.id),
    ]);
    const heldIds = new Set(holders.map((h) => h.userId));
    // Someone who holds it and had started it shows up once, under "Earned it".
    const stillPreparing = preparers.filter((p) => !heldIds.has(p.userId));
    const [members, doneByUser] = await Promise.all([
      this.users.findCommunityMembers([...heldIds, ...stillPreparing.map((p) => p.userId)], filter),
      this.chapterProgress.doneByUser(
        cert.id,
        stillPreparing.map((p) => p.userId),
      ),
    ]);
    const byId = new Map(members.map((m) => [m.id, m]));

    const toList = (
      entries: { userId: string; since: Date }[],
      withPct: boolean,
    ): CommunityList => {
      const people = entries.flatMap(({ userId, since }) => {
        const member = byId.get(userId);
        return member ? [{ member, since, lastName: member.lastName }] : [];
      });
      people.sort(newestFirst);
      return {
        total: people.length,
        items: people.slice(0, COMMUNITY_LIST_LIMIT).map(({ member, since }) => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarPath: avatarPath(member.id, member.avatarKey),
          classCode: member.class.code,
          year: member.class.year as Year,
          specialty: (member.class.specialty?.code ?? null) as SpecialtyCode | null,
          email: member.email,
          since: since.toISOString(),
          // Classmates see a percentage, never which chapters.
          pct: withPct ? percentDone(doneByUser.get(member.id) ?? 0, cert.chapterCount) : null,
        })),
      };
    };
    return { earned: toList(holders, false), preparing: toList(stillPreparing, true) };
  }

  /**
   * Ticks or unticks a chapter, inside the caller's transaction. The certification must be in
   * progress for the student: 404 for an unknown chapter or a retired certification, 409 when
   * the student hasn't started it or already holds it.
   */
  async setChapterDone(
    userId: string,
    chapterId: string,
    done: boolean,
    manager: EntityManager,
  ): Promise<ChapterChange> {
    // Every read goes through `manager`: a second pool connection per transaction would
    // exhaust the pool under concurrent ticks.
    const chapter = await this.chapterProgress.findChapter(chapterId, manager);
    const cert = chapter?.certification;
    if (!chapter || !cert?.isActive) throw new NotFoundException('Chapter not found');
    const held = await this.userCertifications.holds(userId, cert.id, manager);
    const preparing = await this.preparations.isPreparing(userId, cert.id, manager);
    if (held || !preparing) {
      throw new ProblemException({
        type: PROGRESS_PROBLEM.notPreparing,
        title: 'Certification not in progress',
        status: HttpStatus.CONFLICT,
        detail: held
          ? `You already hold ${cert.code}.`
          : `Start ${cert.code} before ticking its chapters.`,
      });
    }
    const changed = await this.chapterProgress.set(
      manager,
      { userId, chapterId, certificationId: cert.id },
      done,
    );
    const doneCount = await this.chapterProgress.countFor(userId, cert.id, manager);
    return {
      changed,
      certificationId: cert.id,
      slug: cert.slug,
      code: cert.code,
      done: doneCount,
      total: cert.chapterCount,
    };
  }

  /** Chapters the student has ticked, across every certification. */
  completedChapterCount(userId: string, manager?: EntityManager): Promise<number> {
    return this.chapterProgress.countAll(userId, manager);
  }

  /** My status on one certification and the chapters I ticked. */
  async myProgress(userId: string, slug: string): Promise<MyCertificationProgress> {
    const cert = await this.activeBySlug(slug);
    const [held, preparing, doneChapterIds] = await Promise.all([
      this.userCertifications.listForUser(userId),
      this.preparations.listForUser(userId),
      this.chapterProgress.doneIds(userId, cert.id),
    ]);
    const [status] = mergeMyCertifications(
      held.filter((entry) => entry.certificationId === cert.id),
      preparing.filter((entry) => entry.certificationId === cert.id),
      () => cert.slug,
    );
    const done = doneChapterIds.length;
    return {
      slug: cert.slug,
      status: status?.status ?? null,
      since: status?.since ?? null,
      doneChapterIds,
      done,
      total: cert.chapterCount,
      pct: percentDone(done, cert.chapterCount),
    };
  }

  /**
   * Certifications the student is preparing and doesn't hold, with the chapters ticked and the
   * last time they touched each one (latest tick, else the start).
   */
  async inProgress(userId: string): Promise<InProgressCertification[]> {
    const [preparing, held, tallies] = await Promise.all([
      this.preparations.listForUser(userId),
      this.userCertifications.listForUser(userId),
      this.chapterProgress.talliesFor(userId),
    ]);
    const heldIds = new Set(held.map((entry) => entry.certificationId));
    const cards = await this.cards(
      preparing.map((p) => p.certificationId).filter((id) => !heldIds.has(id)),
    );
    return preparing.flatMap(({ certificationId, since }) => {
      const card = cards.get(certificationId);
      if (!card) return [];
      const tally = tallies.get(certificationId);
      const lastActivityAt = tally && tally.lastAt > since ? tally.lastAt : since;
      return [{ ...card, startedAt: since, done: tally?.done ?? 0, lastActivityAt }];
    });
  }

  /** The certification's chapters in syllabus order, with the ones the student ticked. */
  async syllabus(userId: string, certificationId: string): Promise<DashboardChapter[]> {
    const [cert, doneIds] = await Promise.all([
      this.certifications.findOne({
        where: { id: certificationId },
        relations: { chapters: true },
        order: { chapters: { order: 'ASC' } },
      }),
      this.chapterProgress.doneIds(userId, certificationId),
    ]);
    const done = new Set(doneIds);
    return (cert?.chapters ?? []).map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      estimatedMinutes: chapter.estimatedMinutes,
      done: done.has(chapter.id),
    }));
  }

  /** Active certifications by id, with what the dashboard cards show. */
  async cards(ids: string[]): Promise<Map<string, CertificationCard>> {
    if (!ids.length) return new Map();
    const rows = await this.certifications.find({
      where: { id: In(ids), isActive: true },
      relations: { provider: true, chapters: true },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          slug: row.slug,
          code: row.code,
          name: row.name,
          level: row.level,
          provider: { code: row.provider.code, name: row.provider.name, hue: row.provider.hue },
          badgeAsset: row.badgeAsset,
          chapterCount: row.chapterCount,
          studyMinutes: row.chapters.reduce((sum, c) => sum + c.estimatedMinutes, 0),
        },
      ]),
    );
  }

  /** Codes and slugs by id, retired certifications included (the feed keeps its history). */
  async refs(ids: string[]): Promise<Map<string, { code: string; slug: string }>> {
    if (!ids.length) return new Map();
    const rows = await this.certifications.find({
      where: { id: In(ids) },
      select: { id: true, code: true, slug: true },
    });
    return new Map(rows.map((row) => [row.id, { code: row.code, slug: row.slug }]));
  }

  /** Who holds the certification. */
  async holderIds(certificationId: string): Promise<string[]> {
    return (await this.userCertifications.holdersOf(certificationId)).map((h) => h.userId);
  }

  /** Ids of the certifications the student holds. */
  async heldIds(userId: string): Promise<string[]> {
    return (await this.userCertifications.listForUser(userId)).map((h) => h.certificationId);
  }

  /** Students who hold or prepare at least one certification. */
  async engagedUserIds(): Promise<string[]> {
    const [holders, preparers] = await Promise.all([
      this.userCertifications.userIds(),
      this.preparations.userIds(),
    ]);
    return [...new Set([...holders, ...preparers])];
  }

  private async activeBySlug(slug: string): Promise<Certification> {
    const cert = await this.certifications.findOneBy({ slug, isActive: true });
    if (!cert) throw notFound(slug);
    return cert;
  }

  private async activeSlugs(): Promise<Map<string, string>> {
    const rows = await this.certifications.find({
      where: { isActive: true },
      select: { id: true, slug: true },
    });
    return new Map(rows.map((row) => [row.id, row.slug]));
  }
}

export interface ChapterChange {
  /** False when the chapter was already in that state. */
  changed: boolean;
  certificationId: string;
  slug: string;
  code: string;
  /** Chapters of the certification ticked after the change. */
  done: number;
  total: number;
}

export interface CertificationCard {
  id: string;
  slug: string;
  code: string;
  name: string;
  level: Certification['level'];
  provider: { code: string; name: string; hue: number };
  badgeAsset: string | null;
  chapterCount: number;
  studyMinutes: number;
}

export type InProgressCertification = CertificationCard & {
  startedAt: Date;
  done: number;
  lastActivityAt: Date;
};

function notFound(slug: string): NotFoundException {
  return new NotFoundException(`Certification "${slug}" not found`);
}

function emptyList(): CommunityList {
  return { total: 0, items: [] };
}

function toSummary(row: Certification, earnedCount: number): CertificationSummary {
  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    examCode: row.examCode,
    level: row.level,
    difficulty: row.difficulty,
    provider: { code: row.provider.code, name: row.provider.name, hue: row.provider.hue },
    forAllSpecialties: row.forAllSpecialties,
    specialties: row.specialties.map((s) => s.code as SpecialtyCode).sort(),
    chapterCount: row.chapterCount,
    badgeAsset: row.badgeAsset,
    earnedCount,
  };
}
