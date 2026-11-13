import { z } from 'zod';
import { SlugSchema } from './catalog.js';
import { ordinalSuffix } from './leaderboard.js';
import { BADGES, BadgeKeySchema, LevelRankSchema, LEVELS, levelName } from './progress.js';

/**
 * Release 1 notifies about what real events can trigger: classmates, the leaderboard and the
 * student's own progress. Exam requests, verifications and exam sessions arrive with their
 * features (Release 2).
 */
export const NOTIFICATION_CATEGORIES = ['community', 'leaderboard', 'progress'] as const;
export const NotificationCategorySchema = z.enum(NOTIFICATION_CATEGORIES);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NOTIFICATION_KINDS = [
  'classmates_started',
  'rank_changed',
  'level_reached',
  'badge_earned',
  'syllabus_completed',
] as const;
export const NotificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

const CATEGORY_OF: Record<NotificationKind, NotificationCategory> = {
  classmates_started: 'community',
  rank_changed: 'leaderboard',
  level_reached: 'progress',
  badge_earned: 'progress',
  syllabus_completed: 'progress',
};

export function categoryOf(kind: NotificationKind): NotificationCategory {
  return CATEGORY_OF[kind];
}

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  community: 'Community',
  leaderboard: 'Leaderboard',
  progress: 'Progress',
};

/** The rows of Settings › Notifications. */
export const NOTIFICATION_CATEGORY_HINT: Record<NotificationCategory, string> = {
  community: 'Classmates starting a certification you’re preparing',
  leaderboard: 'Your position change, once a week',
  progress: 'Levels, badges and finished syllabuses',
};

export const ChannelsSchema = z.object({ inApp: z.boolean(), email: z.boolean() });
export type Channels = z.infer<typeof ChannelsSchema>;

/** What a student gets until they choose otherwise (decision 2026-11-13). */
export const NOTIFICATION_DEFAULTS: Record<NotificationCategory, Channels> = {
  community: { inApp: true, email: false },
  leaderboard: { inApp: true, email: false },
  progress: { inApp: true, email: true },
};

export const NotificationPreferenceSchema = ChannelsSchema.extend({
  category: NotificationCategorySchema,
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

/** Every category, in NOTIFICATION_CATEGORIES order. */
export const NotificationPreferencesSchema = z.object({
  items: z.array(NotificationPreferenceSchema),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

/** Send the categories that change. */
export const UpdateNotificationPreferencesSchema = z.object({
  items: z
    .array(NotificationPreferenceSchema)
    .min(1)
    .max(NOTIFICATION_CATEGORIES.length)
    .refine((items) => new Set(items.map((item) => item.category)).size === items.length, {
      message: 'Each category at most once',
    }),
});
export type UpdateNotificationPreferencesInput = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;

/** The saved choices over the defaults, one entry per category. */
export function withPreferenceDefaults(
  saved: readonly NotificationPreference[],
): NotificationPreference[] {
  return NOTIFICATION_CATEGORIES.map(
    (category) =>
      saved.find((item) => item.category === category) ?? {
        category,
        ...NOTIFICATION_DEFAULTS[category],
      },
  );
}

/** First names kept on "3 students in your class started…". */
export const NOTIFICATION_NAMES_MAX = 3;

export const NotificationSchema = z.object({
  id: z.uuid(),
  kind: NotificationKindSchema,
  category: NotificationCategorySchema,
  /** When it happened; a roll-up moves up when it grows. */
  at: z.iso.datetime({ offset: true }),
  read: z.boolean(),
  certification: z.object({ code: z.string(), slug: SlugSchema }).nullable(),
  /** classmates_started: how many classmates that day. */
  count: z.number().int().positive().nullable(),
  /** classmates_started: first names of those who show their name, the first few. */
  names: z.array(z.string()).max(NOTIFICATION_NAMES_MAX),
  /** rank_changed: my rank, out of `total`, and the places gained (negative: lost). */
  rank: z.number().int().positive().nullable(),
  total: z.number().int().positive().nullable(),
  change: z.number().int().nullable(),
  /** rank_changed: the specialty whose board it is; null for students without one yet. */
  board: z.string().nullable(),
  level: LevelRankSchema.nullable(),
  badge: BadgeKeySchema.nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NOTIFICATION_FILTERS = ['all', 'unread', ...NOTIFICATION_CATEGORIES] as const;
export const NotificationFilterSchema = z.enum(NOTIFICATION_FILTERS);
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

export const NOTIFICATION_PAGE_SIZE = 20;

export const NotificationQuerySchema = z.object({
  filter: NotificationFilterSchema.default('all'),
  /** `nextCursor` of the page before. */
  cursor: z.string().max(80).optional(),
});
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

export const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
  /** Null on the last page. */
  nextCursor: z.string().nullable(),
  /** Every unread notification, whatever the filter. */
  unread: z.number().int().nonnegative(),
});
export type NotificationList = z.infer<typeof NotificationListSchema>;

export const UnreadCountSchema = z.object({ unread: z.number().int().nonnegative() });
export type UnreadCount = z.infer<typeof UnreadCountSchema>;

export const NotificationParamsSchema = z.object({ id: z.uuid() });

export interface NotificationText {
  title: string;
  body: string;
  /** Material Symbols name. */
  icon: string;
  /** Where the notification leads: a path inside the app. */
  action: { label: string; href: string } | null;
}

const places = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

/** "Mehdi", "Mehdi and Salma", "Mehdi, Salma and Karim", "Mehdi, Salma and 2 others". */
export function joinNames(names: readonly string[], total: number): string {
  const others = Math.max(0, total - names.length);
  const parts = others > 0 ? [...names, `${others} ${others === 1 ? 'other' : 'others'}`] : names;
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * The words of a notification, shared by the app and the emails so they always agree.
 */
export function notificationText(n: Notification): NotificationText {
  const code = n.certification?.code ?? 'a certification';
  switch (n.kind) {
    case 'classmates_started': {
      const count = n.count ?? 1;
      const single = count === 1;
      const who = n.names.length ? joinNames(n.names, count) : 'They';
      const verb = n.names.length && single ? 'is' : 'are';
      return {
        title:
          single && n.names[0]
            ? `${n.names[0]} started ${code}`
            : single
              ? `A student in your class started ${code}`
              : `${count} students in your class started ${code}`,
        body: `${who} ${verb} preparing the same certification as you.`,
        icon: 'person_add',
        action: n.certification
          ? { label: 'View', href: `/catalog/${n.certification.slug}?tab=community` }
          : null,
      };
    }
    case 'rank_changed': {
      const change = n.change ?? 0;
      const board = n.board ? `the ${n.board} leaderboard` : 'the leaderboard';
      const rank = n.rank ?? 1;
      return {
        title:
          change >= 0
            ? `You moved up ${places(change)} on ${board}`
            : `You dropped ${places(-change)} on ${board}`,
        body: `You’re ${rank}${ordinalSuffix(rank)}${n.total ? ` of ${n.total}` : ''} this week.`,
        icon: 'military_tech',
        action: { label: 'View leaderboard', href: '/leaderboard?period=all' },
      };
    }
    case 'level_reached': {
      const rank = n.level ?? 1;
      const next = LEVELS.find((level) => level.rank === rank + 1);
      return {
        title: `You reached ${levelName(rank)} level`,
        body: next
          ? `${next.name} starts at ${next.min.toLocaleString('en-US')} points.`
          : 'That’s the highest level.',
        icon: 'workspace_premium',
        action: { label: 'View profile', href: '/profile' },
      };
    }
    case 'badge_earned': {
      const badge = n.badge ? BADGES[n.badge] : null;
      return {
        title: `You earned the ${badge?.name ?? 'new'} badge`,
        body: badge ? `${badge.description}.` : 'It now appears on your profile.',
        icon: badge?.icon ?? 'workspace_premium',
        action: { label: 'View profile', href: '/profile' },
      };
    }
    case 'syllabus_completed':
      return {
        title: `You finished the ${code} syllabus`,
        body: 'Every chapter is ticked.',
        icon: 'task_alt',
        action: n.certification
          ? { label: 'View certification', href: `/catalog/${n.certification.slug}` }
          : null,
      };
  }
}

export const NOTIFICATION_GROUPS = ['today', 'week', 'earlier'] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

export const NOTIFICATION_GROUP_LABEL: Record<NotificationGroup, string> = {
  today: 'Today',
  week: 'This week',
  earlier: 'Earlier',
};

const tunisDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Tunis',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const DAY_MS = 86_400_000;

/** Today in Tunis, the six days before it, or earlier. */
export function notificationGroup(at: Date, now: Date): NotificationGroup {
  if (tunisDay.format(at) === tunisDay.format(now)) return 'today';
  const sixDaysAgo = tunisDay.format(new Date(now.getTime() - 6 * DAY_MS));
  return tunisDay.format(at) >= sixDaysAgo ? 'week' : 'earlier';
}
