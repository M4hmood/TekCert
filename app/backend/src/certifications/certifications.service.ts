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
  filterCatalog,
  type MyCertification,
  type MyCertifications,
  type SpecialtyCode,
  type Year,
} from '@tekcert/types';
import { In, type Repository } from 'typeorm';
import { ProblemException } from '../common/exceptions/problem.exception';
import { PathsService } from '../paths/paths.service';
import { UsersService } from '../users/users.service';
import { avatarPath } from '../users/utils/avatar-path';
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
  async start(userId: string, slug: string): Promise<MyCertification & { created: boolean }> {
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
    return { slug: cert.slug, status: 'in_progress', since: startedAt.toISOString(), created };
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
    const members = await this.users.findCommunityMembers(
      [...heldIds, ...stillPreparing.map((p) => p.userId)],
      filter,
    );
    const byId = new Map(members.map((m) => [m.id, m]));

    const toList = (entries: { userId: string; since: Date }[]): CommunityList => {
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
        })),
      };
    };
    return { earned: toList(holders), preparing: toList(stillPreparing) };
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
