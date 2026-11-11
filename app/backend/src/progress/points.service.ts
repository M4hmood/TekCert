import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BADGE_KEYS,
  type BadgeKey,
  type BadgeState,
  levelFor,
  type MyPoints,
} from '@tekcert/types';
import type { EntityManager, Repository } from 'typeorm';
import { PointEvent, type PointReason } from './entities/point-event.entity';
import { UserBadge } from './entities/user-badge.entity';

export interface PointEntry {
  userId: string;
  delta: number;
  reason: PointReason;
  certificationId: string | null;
  chapterId: string | null;
}

/** The points ledger and the badges. Totals are always summed from the ledger. */
@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointEvent) private readonly events: Repository<PointEvent>,
    @InjectRepository(UserBadge) private readonly badges: Repository<UserBadge>,
  ) {}

  /** Appends one row to the ledger, inside the caller's transaction. */
  async record(manager: EntityManager, entry: PointEntry): Promise<void> {
    await manager.getRepository(PointEvent).insert(entry);
  }

  /** `SUM(delta)` of the student's ledger. */
  async total(userId: string, manager?: EntityManager): Promise<number> {
    const repository = manager?.getRepository(PointEvent) ?? this.events;
    const row = await repository
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.delta), 0)::int', 'total')
      .where('e.userId = :userId', { userId })
      .getRawOne<{ total: number }>();
    return row?.total ?? 0;
  }

  /** `SUM(delta)` for each of `userIds`; a student without ledger rows is absent. */
  async totals(userIds: string[]): Promise<Map<string, number>> {
    if (!userIds.length) return new Map();
    const rows = await this.events
      .createQueryBuilder('e')
      .select('e.userId', 'userId')
      .addSelect('SUM(e.delta)::int', 'total')
      .where('e.userId IN (:...userIds)', { userIds })
      .groupBy('e.userId')
      .getRawMany<{ userId: string; total: number }>();
    return new Map(rows.map((row) => [row.userId, row.total]));
  }

  /** Grants the badges the student doesn't have yet; returns the ones granted now. */
  async award(manager: EntityManager, userId: string, keys: BadgeKey[]): Promise<BadgeKey[]> {
    if (!keys.length) return [];
    const inserted = await manager
      .createQueryBuilder()
      .insert()
      .into(UserBadge)
      .values(keys.map((badge) => ({ userId, badge })))
      .orIgnore()
      .returning(['badge'])
      .execute();
    const granted = new Set((inserted.raw as { badge: BadgeKey }[]).map((row) => row.badge));
    return keys.filter((key) => granted.has(key));
  }

  /** All five badges, in display order, with the date each was earned. */
  async badgesOf(userId: string): Promise<BadgeState[]> {
    const rows = await this.badges.find({ where: { userId } });
    const earned = new Map(rows.map((row) => [row.badge, row.earnedAt]));
    return BADGE_KEYS.map((key) => ({
      key,
      earnedAt: earned.get(key)?.toISOString() ?? null,
    }));
  }

  async summary(userId: string): Promise<MyPoints> {
    const [points, badges] = await Promise.all([this.total(userId), this.badgesOf(userId)]);
    return { points, level: levelFor(points), badges };
  }
}
