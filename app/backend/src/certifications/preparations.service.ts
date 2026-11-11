import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, type Repository } from 'typeorm';
import { Preparation } from './entities/preparation.entity';

/** Certifications students have started ("in progress"). */
@Injectable()
export class PreparationsService {
  constructor(
    @InjectRepository(Preparation)
    private readonly preparations: Repository<Preparation>,
  ) {}

  /**
   * Starts preparing a certification. Starting twice keeps the first start date, so a double
   * click or a retry is harmless. `created` is false when it was already started.
   */
  async start(
    userId: string,
    certificationId: string,
  ): Promise<{ startedAt: Date; created: boolean }> {
    const inserted = await this.preparations
      .createQueryBuilder()
      .insert()
      .values({ userId, certificationId })
      .orIgnore()
      .returning(['startedAt'])
      .execute();
    const created = (inserted.raw as unknown[]).length > 0;
    const row = await this.preparations.findOneByOrFail({ userId, certificationId });
    return { startedAt: row.startedAt, created };
  }

  async listForUser(userId: string): Promise<{ certificationId: string; since: Date }[]> {
    const rows = await this.preparations.find({
      where: { userId },
      select: { certificationId: true, startedAt: true },
    });
    return rows.map((row) => ({ certificationId: row.certificationId, since: row.startedAt }));
  }

  /** What each of `userIds` has started, oldest first. */
  async listForUsers(
    userIds: string[],
  ): Promise<{ userId: string; certificationId: string; since: Date }[]> {
    if (!userIds.length) return [];
    const rows = await this.preparations.find({
      where: { userId: In(userIds) },
      select: { userId: true, certificationId: true, startedAt: true },
      order: { startedAt: 'ASC', certificationId: 'ASC' },
    });
    return rows.map((row) => ({
      userId: row.userId,
      certificationId: row.certificationId,
      since: row.startedAt,
    }));
  }

  /** Students who have started at least one of `certificationIds`. */
  async preparersOfAny(certificationIds: string[]): Promise<string[]> {
    if (!certificationIds.length) return [];
    const rows = await this.preparations
      .createQueryBuilder('p')
      .select('DISTINCT p.userId', 'userId')
      .where('p.certificationId IN (:...certificationIds)', { certificationIds })
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  isPreparing(userId: string, certificationId: string, manager?: EntityManager): Promise<boolean> {
    const repository = manager?.getRepository(Preparation) ?? this.preparations;
    return repository.existsBy({ userId, certificationId });
  }

  /** Every student who has started at least one certification. */
  async userIds(): Promise<string[]> {
    const rows = await this.preparations
      .createQueryBuilder('p')
      .select('DISTINCT p.userId', 'userId')
      .getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  countFor(certificationId: string): Promise<number> {
    return this.preparations.countBy({ certificationId });
  }

  /** Who is preparing the certification, with the day they started. */
  async preparersOf(certificationId: string): Promise<{ userId: string; since: Date }[]> {
    const rows = await this.preparations.find({
      where: { certificationId },
      select: { userId: true, startedAt: true },
    });
    return rows.map((row) => ({ userId: row.userId, since: row.startedAt }));
  }
}
