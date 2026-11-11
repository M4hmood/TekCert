import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, type Repository } from 'typeorm';
import { UserCertification } from './entities/user-certification.entity';

/** The certifications students hold. Unverified ones earn no points (PLAN.md). */
@Injectable()
export class UserCertificationsService {
  constructor(
    @InjectRepository(UserCertification)
    private readonly userCertifications: Repository<UserCertification>,
  ) {}

  /** Codes and slugs of the student's certifications, oldest first. */
  async heldBy(userId: string): Promise<{ code: string; slug: string }[]> {
    const rows = await this.userCertifications.find({
      where: { userId },
      relations: { certification: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({ code: row.certification.code, slug: row.certification.slug }));
  }

  /** The student's certifications with the day each was declared. */
  async listForUser(userId: string): Promise<{ certificationId: string; since: Date }[]> {
    const rows = await this.userCertifications.find({
      where: { userId },
      select: { certificationId: true, createdAt: true },
    });
    return rows.map((row) => ({ certificationId: row.certificationId, since: row.createdAt }));
  }

  /** What each of `userIds` holds, oldest first. */
  async listForUsers(
    userIds: string[],
  ): Promise<{ userId: string; certificationId: string; since: Date }[]> {
    if (!userIds.length) return [];
    const rows = await this.userCertifications.find({
      where: { userId: In(userIds) },
      select: { userId: true, certificationId: true, createdAt: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      userId: row.userId,
      certificationId: row.certificationId,
      since: row.createdAt,
    }));
  }

  /** Students who hold at least one of `certificationIds`. */
  async holdersOfAny(certificationIds: string[]): Promise<string[]> {
    if (!certificationIds.length) return [];
    const rows = await this.userCertifications
      .createQueryBuilder('uc')
      .select('DISTINCT uc.userId', 'userId')
      .where('uc.certificationId IN (:...certificationIds)', { certificationIds })
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  async holds(userId: string, certificationId: string, manager?: EntityManager): Promise<boolean> {
    const repository = manager?.getRepository(UserCertification) ?? this.userCertifications;
    return repository.existsBy({ userId, certificationId });
  }

  /** How many students hold each certification. Certifications nobody holds are absent. */
  async countByCertification(): Promise<Map<string, number>> {
    const rows = await this.userCertifications
      .createQueryBuilder('uc')
      .select('uc.certificationId', 'certificationId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('uc.certificationId')
      .getRawMany<{ certificationId: string; count: number }>();
    return new Map(rows.map((row) => [row.certificationId, row.count]));
  }

  /** Every student who holds at least one certification. */
  async userIds(): Promise<string[]> {
    const rows = await this.userCertifications
      .createQueryBuilder('uc')
      .select('DISTINCT uc.userId', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  countFor(certificationId: string): Promise<number> {
    return this.userCertifications.countBy({ certificationId });
  }

  /** Who holds the certification, with the day they declared it. */
  async holdersOf(certificationId: string): Promise<{ userId: string; since: Date }[]> {
    const rows = await this.userCertifications.find({
      where: { certificationId },
      select: { userId: true, createdAt: true },
    });
    return rows.map((row) => ({ userId: row.userId, since: row.createdAt }));
  }

  /**
   * Replaces the certifications declared during onboarding. They stay unverified until proof
   * upload and staff review exist (Release 2). Pass `manager` to run inside the caller's
   * transaction.
   */
  async replaceOnboardingDeclarations(
    userId: string,
    certificationIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager?.getRepository(UserCertification) ?? this.userCertifications;
    await repository.delete({ userId, source: 'onboarding', status: 'unverified' });
    if (!certificationIds.length) return;
    await repository
      .createQueryBuilder()
      .insert()
      .values(
        certificationIds.map((certificationId) => ({
          userId,
          certificationId,
          source: 'onboarding' as const,
          status: 'unverified' as const,
        })),
      )
      // A certification already recorded another way keeps that record.
      .orIgnore()
      .execute();
  }
}
