import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type BadgeKey,
  BadgeKeySchema,
  categoryOf,
  type Channels,
  type Notification as NotificationDto,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_KINDS,
  NOTIFICATION_NAMES_MAX,
  NOTIFICATION_PAGE_SIZE,
  type NotificationCategory,
  type NotificationKind,
  type NotificationList,
  type NotificationPreferences,
  type NotificationQuery,
  notificationText,
  type UnreadCount,
  type UpdateNotificationPreferencesInput,
  withPreferenceDefaults,
} from '@tekcert/types';
import { type EntityManager, In, IsNull, LessThan, type Repository } from 'typeorm';
import { CertificationsService } from '../certifications/certifications.service';
import { CLOCK, type Clock } from '../common/utils/clock';
import type { Env } from '../config/env';
import { MAIL_SENDER, type MailSender } from '../mail/interfaces/mail-sender';
import { UsersService } from '../users/users.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification, type NotificationPayload } from './entities/notification.entity';
import { notificationMail } from './templates/emails';
import { dedupeKey, encodeCursor, parseCursor } from './utils/keys';

/** Something that happened to one student and is worth telling them. */
export type NotificationEvent = { userId: string } & (
  | { kind: 'level_reached'; level: number }
  | { kind: 'badge_earned'; badge: BadgeKey }
  | { kind: 'syllabus_completed'; certificationId: string }
  | {
      kind: 'rank_changed';
      /** The day the weekly run happened, in Tunis: one notification per run. */
      day: string;
      rank: number;
      total: number;
      /** Places gained since last week; negative when lost. */
      change: number;
      /** The specialty whose board it is; null for students without one yet. */
      board: string | null;
    }
);

/** A notification written just now whose owner also wants it by email. */
export interface PendingEmail {
  notificationId: string;
}

type CertificationRef = { code: string; slug: string };

/**
 * Owns the notifications and each student's choices about them. Other modules announce events
 * here; nothing in this module calls them back.
 *
 * Privacy: every read and write is scoped to the owner's id, taken from the session.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');
  private readonly webUrl: string;

  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferences: Repository<NotificationPreference>,
    private readonly users: UsersService,
    private readonly certifications: CertificationsService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
    @Inject(CLOCK) private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true });
  }

  /**
   * Tells one student about an event, unless they switched its category off everywhere or were
   * already told. Pass `manager` to write inside the caller's transaction, then hand the result
   * to `deliver` once it has committed.
   */
  async record(event: NotificationEvent, manager?: EntityManager): Promise<PendingEmail[]> {
    const channels = await this.channelsFor([event.userId], categoryOf(event.kind), manager);
    const wanted = channels.get(event.userId);
    if (!wanted || (!wanted.inApp && !wanted.email)) return [];
    const inserted = await (manager ?? this.notifications.manager)
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values({
        userId: event.userId,
        kind: event.kind,
        ...rowFor(event),
        inApp: wanted.inApp,
        occurredAt: this.clock.now(),
      })
      .orIgnore()
      .returning(['id'])
      .execute();
    const id = (inserted.raw as { id: string }[])[0]?.id;
    return id && wanted.email ? [{ notificationId: id }] : [];
  }

  /**
   * "N students in your class started X": one line per recipient, certification and day. A
   * further classmate that day raises the count, moves the line up and makes it unread again;
   * the email goes out with the first one only. `name` is null for a classmate who hides their
   * name.
   */
  async recordClassmateStart(input: {
    recipientIds: string[];
    certificationId: string;
    name: string | null;
    /** The day in Tunis, "2026-11-13". */
    day: string;
  }): Promise<PendingEmail[]> {
    const channels = await this.channelsFor(input.recipientIds, 'community');
    const pending: PendingEmail[] = [];
    const now = this.clock.now();
    for (const userId of input.recipientIds) {
      const wanted = channels.get(userId);
      if (!wanted || (!wanted.inApp && !wanted.email)) continue;
      const payload: NotificationPayload = { count: 1, names: input.name ? [input.name] : [] };
      const rows = await this.notifications.manager.query<
        { id: string; payload: NotificationPayload }[]
      >(
        `INSERT INTO "notifications"
           ("user_id", "kind", "certification_id", "payload", "dedupe_key", "in_app", "occurred_at")
         VALUES ($1, 'classmates_started', $2, $3::jsonb, $4, $5, $6)
         ON CONFLICT ("user_id", "dedupe_key") DO UPDATE SET
           "payload" = jsonb_build_object(
             'count', ("notifications"."payload"->>'count')::int + 1,
             'names', ("notifications"."payload"->'names') || (EXCLUDED."payload"->'names')),
           "read_at" = NULL,
           "occurred_at" = EXCLUDED."occurred_at"
         RETURNING "id", "payload"`,
        [
          userId,
          input.certificationId,
          JSON.stringify(payload),
          dedupeKey.classmatesStarted(input.certificationId, input.day),
          wanted.inApp,
          now,
        ],
      );
      const row = rows[0];
      // A count of 1 means the line was written now, not raised.
      if (row && row.payload.count === 1 && wanted.email) pending.push({ notificationId: row.id });
    }
    return pending;
  }

  /**
   * Emails what `record` returned, in the background: a request never waits for SMTP. A
   * failure is logged and the notification stays in the app.
   */
  deliver(pending: PendingEmail[]): void {
    if (!pending.length) return;
    void this.send(pending).catch((error: unknown) => {
      this.logger.error(`Notification email failed: ${String(error)}`);
    });
  }

  async list(userId: string, query: NotificationQuery): Promise<NotificationList> {
    const qb = this.notifications
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('n.inApp = true');
    if (query.filter === 'unread') {
      qb.andWhere('n.readAt IS NULL');
    } else if (query.filter !== 'all') {
      qb.andWhere('n.kind IN (:...kinds)', { kinds: kindsIn(query.filter) });
    }
    if (query.cursor) {
      const cursor = parseCursor(query.cursor);
      if (!cursor) throw new BadRequestException('Invalid cursor');
      qb.andWhere('(n.occurredAt, n.id) < (:at, :id)', cursor);
    }
    const [rows, unread] = await Promise.all([
      qb
        .orderBy('n.occurredAt', 'DESC')
        .addOrderBy('n.id', 'DESC')
        .take(NOTIFICATION_PAGE_SIZE + 1)
        .getMany(),
      this.countUnread(userId),
    ]);
    const page = rows.slice(0, NOTIFICATION_PAGE_SIZE);
    const refs = await this.refsFor(page);
    const last = page.at(-1);
    return {
      items: page.map((row) => toDto(row, refs)),
      nextCursor:
        rows.length > NOTIFICATION_PAGE_SIZE && last
          ? encodeCursor(last.occurredAt, last.id)
          : null,
      unread,
    };
  }

  async unreadCount(userId: string): Promise<UnreadCount> {
    return { unread: await this.countUnread(userId) };
  }

  /** 404 for an unknown id and for someone else's notification, with the same answer. */
  async markRead(userId: string, id: string): Promise<UnreadCount> {
    const owned = await this.notifications.existsBy({ id, userId, inApp: true });
    if (!owned) throw new NotFoundException('Notification not found');
    await this.notifications.update({ id, userId, readAt: IsNull() }, { readAt: this.clock.now() });
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string): Promise<UnreadCount> {
    await this.notifications.update({ userId, readAt: IsNull() }, { readAt: this.clock.now() });
    return { unread: 0 };
  }

  /** Removes notifications that happened before `before`; returns how many. */
  async deleteOlderThan(before: Date): Promise<number> {
    const deleted = await this.notifications.delete({ occurredAt: LessThan(before) });
    return deleted.affected ?? 0;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const saved = await this.preferences.find({ where: { userId } });
    return {
      items: withPreferenceDefaults(
        saved.map(({ category, inApp, email }) => ({ category, inApp, email })),
      ),
    };
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    await this.preferences.upsert(
      input.items.map((item) => ({ userId, ...item })),
      ['userId', 'category'],
    );
    return this.getPreferences(userId);
  }

  /** Each student's choice for a category: what they saved, else the defaults. */
  private async channelsFor(
    userIds: string[],
    category: NotificationCategory,
    manager?: EntityManager,
  ): Promise<Map<string, Channels>> {
    if (!userIds.length) return new Map();
    const repository = manager?.getRepository(NotificationPreference) ?? this.preferences;
    const saved = await repository.find({ where: { userId: In(userIds), category } });
    const byUser = new Map(saved.map((row) => [row.userId, row]));
    return new Map(
      userIds.map((userId) => {
        const row = byUser.get(userId);
        return [
          userId,
          row ? { inApp: row.inApp, email: row.email } : NOTIFICATION_DEFAULTS[category],
        ];
      }),
    );
  }

  private countUnread(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, inApp: true, readAt: IsNull() });
  }

  private refsFor(rows: Notification[]): Promise<Map<string, CertificationRef>> {
    return this.certifications.refs([...new Set(rows.flatMap((row) => row.certificationId ?? []))]);
  }

  private async send(pending: PendingEmail[]): Promise<void> {
    const rows = await this.notifications.find({
      where: { id: In(pending.map((item) => item.notificationId)), emailedAt: IsNull() },
    });
    const refs = await this.refsFor(rows);
    for (const row of rows) {
      const user = await this.users.findById(row.userId);
      // Only a verified address that finished onboarding is written to.
      if (!user?.emailVerifiedAt || !user.onboardingCompletedAt) continue;
      await this.mail.send(
        notificationMail(user.email, {
          firstName: user.firstName,
          text: notificationText(toDto(row, refs)),
          webUrl: this.webUrl,
        }),
      );
      await this.notifications.update({ id: row.id }, { emailedAt: this.clock.now() });
    }
  }
}

/** The event as stored: what makes it unique for the student, and what the words need. */
function rowFor(
  event: NotificationEvent,
): Pick<Notification, 'dedupeKey' | 'certificationId' | 'payload'> {
  switch (event.kind) {
    case 'level_reached':
      return {
        dedupeKey: dedupeKey.level(event.level),
        certificationId: null,
        payload: { level: event.level },
      };
    case 'badge_earned':
      return {
        dedupeKey: dedupeKey.badge(event.badge),
        certificationId: null,
        payload: { badge: event.badge },
      };
    case 'syllabus_completed':
      return {
        dedupeKey: dedupeKey.syllabus(event.certificationId),
        certificationId: event.certificationId,
        payload: {},
      };
    case 'rank_changed':
      return {
        dedupeKey: dedupeKey.rankChanged(event.day),
        certificationId: null,
        payload: {
          rank: event.rank,
          total: event.total,
          change: event.change,
          board: event.board,
        },
      };
  }
}

function kindsIn(category: NotificationCategory): NotificationKind[] {
  return NOTIFICATION_KINDS.filter((kind) => categoryOf(kind) === category);
}

function toDto(row: Notification, refs: Map<string, CertificationRef>): NotificationDto {
  const { payload } = row;
  const badge = BadgeKeySchema.safeParse(payload.badge);
  return {
    id: row.id,
    kind: row.kind,
    category: categoryOf(row.kind),
    at: row.occurredAt.toISOString(),
    read: row.readAt !== null,
    certification: (row.certificationId && refs.get(row.certificationId)) || null,
    count: payload.count ?? null,
    names: (payload.names ?? []).slice(0, NOTIFICATION_NAMES_MAX),
    rank: payload.rank ?? null,
    total: payload.total ?? null,
    change: payload.change ?? null,
    board: payload.board ?? null,
    level: payload.level ?? null,
    badge: badge.success ? badge.data : null,
  };
}
