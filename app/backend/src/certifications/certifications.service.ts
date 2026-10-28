import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CertificationDetail,
  CertificationList,
  CertificationListQuery,
  CertificationSummary,
  SpecialtyCode,
} from '@tekcert/types';
import { Brackets, type Repository } from 'typeorm';
import { Certification } from '../database/entities';

@Injectable()
export class CertificationsService {
  constructor(
    @InjectRepository(Certification)
    private readonly certifications: Repository<Certification>,
  ) {}

  async list(query: CertificationListQuery): Promise<CertificationList> {
    const qb = this.certifications
      .createQueryBuilder('cert')
      .innerJoinAndSelect('cert.provider', 'provider')
      .leftJoinAndSelect('cert.specialties', 'specialty')
      .where('cert.isActive = true')
      // Postgres sorts enums in declaration order: foundational → expert.
      .orderBy('provider.name', 'ASC')
      .addOrderBy('cert.level', 'ASC')
      .addOrderBy('cert.code', 'ASC');

    if (query.provider) {
      qb.andWhere('provider.code = :provider', { provider: query.provider.toUpperCase() });
    }
    if (query.level) {
      qb.andWhere('cert.level = :level', { level: query.level });
    }
    if (query.specialty) {
      // Certifications for every specialty match any specialty filter.
      qb.andWhere(
        new Brackets((w) =>
          w.where('cert.forAllSpecialties = true').orWhere(
            `EXISTS (SELECT 1 FROM certification_specialties cs
               JOIN specialties s ON s.id = cs.specialty_id
               WHERE cs.certification_id = cert.id AND s.code = :specialty)`,
            { specialty: query.specialty },
          ),
        ),
      );
    }

    const rows = await qb.getMany();
    return { items: rows.map(toSummary), total: rows.length };
  }

  async findBySlug(slug: string): Promise<CertificationDetail> {
    const row = await this.certifications.findOne({
      where: { slug, isActive: true },
      relations: { provider: true, specialties: true, domains: { chapters: true } },
      order: { domains: { order: 'ASC', chapters: { order: 'ASC' } } },
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

function toSummary(row: Certification): CertificationSummary {
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
  };
}
