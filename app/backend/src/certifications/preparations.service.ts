import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
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
