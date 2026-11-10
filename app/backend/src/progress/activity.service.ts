import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ACTIVITY_LIMIT,
  type ActivityFeed,
  type ActivityItem,
  type ActivityKind,
  type BadgeKey,
  type CommunityScope,
} from '@tekcert/types';
import type { EntityManager, Repository } from 'typeorm';
import { CertificationsService } from '../certifications/certifications.service';
import { communityFilterFor } from '../certifications/utils/community-filter';
import { avatarPath } from '../users/utils/avatar-path';
import { type CommunityMember, type UserWithEnrolment, UsersService } from '../users/users.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { groupLabel } from './utils/labels';

/** Events read per round while looking for enough in the viewer's scope. */
const PAGE_SIZE = 200;
const MAX_PAGES = 5;

export interface OnceEvent {
  userId: string;
  kind: Exclude<ActivityKind, 'chapters_done'>;
  certificationId?: string;
  badge?: BadgeKey;
  level?: number;
}

/** The classmates feed. */
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityEvent) private readonly events: Repository<ActivityEvent>,
    private readonly certifications: CertificationsService,
    private readonly users: UsersService,
  ) {}

  /**
   * Records an event that happens once (a start, a badge, a level, a finished syllabus). A
   * second time is ignored by the partial unique indexes.
   */
  async recordOnce(event: OnceEvent, manager?: EntityManager): Promise<void> {
    await (manager ?? this.events.manager)
      .createQueryBuilder()
      .insert()
      .into(ActivityEvent)
      .values({
        userId: event.userId,
        kind: event.kind,
        certificationId: event.certificationId ?? null,
        badge: event.badge ?? null,
        level: event.level ?? null,
      })
      .orIgnore()
      .execute();
  }

  /** One more chapter ticked today: today's roll-up line goes up and moves to the top. */
  async chapterDone(
    manager: EntityManager,
    userId: string,
    certificationId: string,
    day: string,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO "activity_events" ("user_id", "kind", "certification_id", "count", "day")
       VALUES ($1, 'chapters_done', $2, 1, $3)
       ON CONFLICT ("user_id", "certification_id", "day") WHERE "kind" = 'chapters_done'
       DO UPDATE SET "count" = "activity_events"."count" + 1, "updated_at" = now()`,
      [userId, certificationId, day],
    );
  }

  /**
   * A chapter unticked: the latest roll-up of that certification still above zero goes down,
   * without moving up the feed. At zero the line is hidden.
   */
  async chapterUndone(
    manager: EntityManager,
    userId: string,
    certificationId: string,
  ): Promise<void> {
    await manager.query(
      `UPDATE "activity_events" SET "count" = "count" - 1
       WHERE "id" = (
         SELECT "id" FROM "activity_events"
         WHERE "user_id" = $1 AND "certification_id" = $2
           AND "kind" = 'chapters_done' AND "count" > 0
         ORDER BY "day" DESC LIMIT 1
       )`,
      [userId, certificationId],
    );
  }

  /**
   * The newest events from other students in the viewer's scope (same rules as "who to ask":
   * verified email, onboarding finished, never the viewer).
   */
  async feed(viewer: UserWithEnrolment, scope: CommunityScope): Promise<ActivityFeed> {
    const filter = communityFilterFor(viewer, { scope });
    if (!filter) return { items: [] };

    const picked: { event: ActivityEvent; member: CommunityMember }[] = [];
    for (let page = 0; page < MAX_PAGES && picked.length < ACTIVITY_LIMIT; page++) {
      const rows = await this.events
        .createQueryBuilder('a')
        .where('a.userId <> :me', { me: viewer.id })
        .andWhere(`(a.kind <> 'chapters_done' OR a.count > 0)`)
        .orderBy('a.updatedAt', 'DESC')
        .addOrderBy('a.id', 'ASC')
        .skip(page * PAGE_SIZE)
        .take(PAGE_SIZE)
        .getMany();
      if (!rows.length) break;
      const members = await this.users.findCommunityMembers(
        [...new Set(rows.map((row) => row.userId))],
        filter,
      );
      const byId = new Map(members.map((member) => [member.id, member]));
      for (const event of rows) {
        const member = byId.get(event.userId);
        if (member && picked.length < ACTIVITY_LIMIT) picked.push({ event, member });
      }
      if (rows.length < PAGE_SIZE) break;
    }

    const refs = await this.certifications.refs([
      ...new Set(picked.flatMap(({ event }) => event.certificationId ?? [])),
    ]);
    return {
      items: picked.map(({ event, member }): ActivityItem => ({
        id: event.id,
        kind: event.kind,
        at: event.updatedAt.toISOString(),
        person: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarPath: avatarPath(member.id, member.avatarKey),
          group: groupLabel(member.class.year, member.class.specialty?.code),
        },
        certification: (event.certificationId && refs.get(event.certificationId)) || null,
        count: event.kind === 'chapters_done' ? event.count : null,
        level: event.level,
        badge: event.badge,
      })),
    };
  }
}
