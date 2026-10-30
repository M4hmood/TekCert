import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
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
