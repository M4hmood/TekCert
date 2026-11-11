import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { Chapter } from './entities/chapter.entity';

export interface CertificationTally {
  done: number;
  /** The last chapter ticked. */
  lastAt: Date;
}

/** Which chapters each student has ticked. Points are the progress module's ledger. */
@Injectable()
export class ChapterProgressService {
  constructor(
    @InjectRepository(ChapterProgress)
    private readonly progress: Repository<ChapterProgress>,
    @InjectRepository(Chapter)
    private readonly chapters: Repository<Chapter>,
  ) {}

  /** The chapter with its certification, or null. */
  findChapter(chapterId: string, manager?: EntityManager): Promise<Chapter | null> {
    const repository = manager?.getRepository(Chapter) ?? this.chapters;
    return repository.findOne({ where: { id: chapterId }, relations: { certification: true } });
  }

  /**
   * Ticks (`done`) or unticks a chapter. Returns false when it was already in that state, so a
   * retry or a double click records nothing. Runs inside the caller's transaction.
   */
  async set(
    manager: EntityManager,
    entry: { userId: string; chapterId: string; certificationId: string },
    done: boolean,
  ): Promise<boolean> {
    const qb = manager.createQueryBuilder();
    if (done) {
      const inserted = await qb
        .insert()
        .into(ChapterProgress)
        .values(entry)
        .orIgnore()
        .returning(['chapterId'])
        .execute();
      return (inserted.raw as unknown[]).length > 0;
    }
    const deleted = await qb
      .delete()
      .from(ChapterProgress)
      .where({ userId: entry.userId, chapterId: entry.chapterId })
      .returning(['chapterId'])
      .execute();
    return (deleted.raw as unknown[]).length > 0;
  }

  countFor(userId: string, certificationId: string, manager?: EntityManager): Promise<number> {
    return this.repo(manager).countBy({ userId, certificationId });
  }

  /** Every chapter the student has ticked, across certifications. */
  countAll(userId: string, manager?: EntityManager): Promise<number> {
    return this.repo(manager).countBy({ userId });
  }

  async doneIds(userId: string, certificationId: string): Promise<string[]> {
    const rows = await this.progress.find({
      where: { userId, certificationId },
      select: { chapterId: true },
    });
    return rows.map((row) => row.chapterId);
  }

  /** Per certification: chapters ticked and when the last one was. */
  async talliesFor(userId: string): Promise<Map<string, CertificationTally>> {
    const rows = await this.progress
      .createQueryBuilder('p')
      .select('p.certificationId', 'certificationId')
      .addSelect('COUNT(*)::int', 'done')
      .addSelect('MAX(p.completedAt)', 'lastAt')
      .where('p.userId = :userId', { userId })
      .groupBy('p.certificationId')
      .getRawMany<{ certificationId: string; done: number; lastAt: Date }>();
    return new Map(
      rows.map((row) => [row.certificationId, { done: row.done, lastAt: new Date(row.lastAt) }]),
    );
  }

  /** Chapters ticked on one certification by each of `userIds`; absent means none. */
  async doneByUser(certificationId: string, userIds: string[]): Promise<Map<string, number>> {
    if (!userIds.length) return new Map();
    const rows = await this.progress
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('COUNT(*)::int', 'done')
      .where('p.certificationId = :certificationId', { certificationId })
      .andWhere('p.userId IN (:...userIds)', { userIds })
      .groupBy('p.userId')
      .getRawMany<{ userId: string; done: number }>();
    return new Map(rows.map((row) => [row.userId, row.done]));
  }

  private repo(manager?: EntityManager): Repository<ChapterProgress> {
    return manager?.getRepository(ChapterProgress) ?? this.progress;
  }
}
