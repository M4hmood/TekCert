import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CertificationDetail,
  CertificationList,
  CertificationListQuery,
  CertificationSummary,
  SpecialtyCode,
} from '@tekcert/types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const summaryInclude = {
  provider: true,
  specialties: { include: { specialty: true } },
  _count: { select: { chapters: true } },
} satisfies Prisma.CertificationInclude;

type CertificationWithSummary = Prisma.CertificationGetPayload<{ include: typeof summaryInclude }>;

@Injectable()
export class CertificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CertificationListQuery): Promise<CertificationList> {
    const where: Prisma.CertificationWhereInput = {
      isActive: true,
      ...(query.provider && { provider: { code: query.provider.toUpperCase() } }),
      ...(query.level && { level: query.level }),
      ...(query.specialty && {
        OR: [
          { forAllSpecialties: true },
          { specialties: { some: { specialty: { code: query.specialty } } } },
        ],
      }),
    };
    const rows = await this.prisma.certification.findMany({
      where,
      include: summaryInclude,
      orderBy: [{ provider: { name: 'asc' } }, { level: 'asc' }, { code: 'asc' }],
    });
    return { items: rows.map(toSummary), total: rows.length };
  }

  async findBySlug(slug: string): Promise<CertificationDetail> {
    const row = await this.prisma.certification.findFirst({
      where: { slug, isActive: true },
      include: {
        ...summaryInclude,
        domains: {
          orderBy: { order: 'asc' },
          include: { chapters: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!row) throw new NotFoundException(`Certification "${slug}" not found`);
    return {
      ...toSummary(row),
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
    };
  }
}

function toSummary(row: CertificationWithSummary): CertificationSummary {
  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    examCode: row.examCode,
    level: row.level,
    difficulty: row.difficulty,
    provider: { code: row.provider.code, name: row.provider.name, hue: row.provider.hue },
    forAllSpecialties: row.forAllSpecialties,
    specialties: row.specialties.map((s) => s.specialty.code as SpecialtyCode),
    chapterCount: row._count.chapters,
    badgeAsset: row.badgeAsset,
  };
}
