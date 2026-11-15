import { describe, expect, it } from 'vitest';
import {
  categoryOf,
  joinNames,
  type Notification,
  notificationGroup,
  NotificationQuerySchema,
  notificationText,
  UpdateNotificationPreferencesSchema,
  withPreferenceDefaults,
} from './notifications.js';

const at = (iso: string) => new Date(iso);

const base: Notification = {
  id: '6f1c1f0e-3c1f-4c59-9a55-0a4d0e7d2b11',
  kind: 'classmates_started',
  category: 'community',
  at: '2026-11-13T09:00:00.000Z',
  read: false,
  certification: { code: 'SAA-C03', slug: 'saa-c03' },
  count: null,
  names: [],
  rank: null,
  total: null,
  change: null,
  board: null,
  level: null,
  badge: null,
};

describe('categoryOf', () => {
  it('files each kind under the category the student can switch off', () => {
    expect(categoryOf('classmates_started')).toBe('community');
    expect(categoryOf('rank_changed')).toBe('leaderboard');
    expect(categoryOf('level_reached')).toBe('progress');
    expect(categoryOf('badge_earned')).toBe('progress');
    expect(categoryOf('syllabus_completed')).toBe('progress');
  });
});

describe('withPreferenceDefaults', () => {
  it('gives every category, in order, with the defaults', () => {
    expect(withPreferenceDefaults([])).toEqual([
      { category: 'community', inApp: true, email: false },
      { category: 'leaderboard', inApp: true, email: false },
      { category: 'progress', inApp: true, email: true },
    ]);
  });

  it('keeps what the student saved', () => {
    const saved = [{ category: 'progress' as const, inApp: false, email: false }];
    expect(withPreferenceDefaults(saved)[2]).toEqual(saved[0]);
    expect(withPreferenceDefaults(saved)[0]).toMatchObject({ inApp: true });
  });
});

describe('UpdateNotificationPreferencesSchema', () => {
  it('refuses the same category twice and unknown categories', () => {
    const row = { category: 'community', inApp: true, email: true };
    expect(UpdateNotificationPreferencesSchema.safeParse({ items: [row] }).success).toBe(true);
    expect(UpdateNotificationPreferencesSchema.safeParse({ items: [row, row] }).success).toBe(
      false,
    );
    expect(
      UpdateNotificationPreferencesSchema.safeParse({ items: [{ ...row, category: 'requests' }] })
        .success,
    ).toBe(false);
    expect(UpdateNotificationPreferencesSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('NotificationQuerySchema', () => {
  it('lists everything by default and refuses an unknown filter', () => {
    expect(NotificationQuerySchema.parse({})).toEqual({ filter: 'all' });
    expect(NotificationQuerySchema.safeParse({ filter: 'requests' }).success).toBe(false);
  });
});

describe('joinNames', () => {
  it('reads as a sentence', () => {
    expect(joinNames(['Mehdi'], 1)).toBe('Mehdi');
    expect(joinNames(['Mehdi', 'Salma'], 2)).toBe('Mehdi and Salma');
    expect(joinNames(['Mehdi', 'Salma', 'Karim'], 3)).toBe('Mehdi, Salma and Karim');
    expect(joinNames(['Mehdi', 'Salma', 'Karim'], 5)).toBe('Mehdi, Salma, Karim and 2 others');
    expect(joinNames(['Mehdi'], 2)).toBe('Mehdi and 1 other');
  });
});

describe('notificationText', () => {
  it('names one classmate, or counts several', () => {
    expect(notificationText({ ...base, count: 1, names: ['Mehdi'] })).toMatchObject({
      title: 'Mehdi started SAA-C03',
      body: 'Mehdi is preparing the same certification as you.',
      action: { label: 'View', href: '/catalog/saa-c03?tab=community' },
    });
    expect(
      notificationText({ ...base, count: 3, names: ['Mehdi', 'Salma', 'Karim'] }),
    ).toMatchObject({
      title: '3 students in your class started SAA-C03',
      body: 'Mehdi, Salma and Karim are preparing the same certification as you.',
    });
  });

  it('names nobody who hides their name', () => {
    expect(notificationText({ ...base, count: 1 })).toMatchObject({
      title: 'A student in your class started SAA-C03',
      body: 'They are preparing the same certification as you.',
    });
    expect(notificationText({ ...base, count: 3, names: ['Mehdi'] }).body).toBe(
      'Mehdi and 2 others are preparing the same certification as you.',
    );
  });

  it('says how far the rank moved, up or down', () => {
    const rank = { ...base, kind: 'rank_changed' as const, certification: null, rank: 14 };
    expect(notificationText({ ...rank, change: 3, total: 86, board: 'CIM' })).toMatchObject({
      title: 'You moved up 3 places on the CIM leaderboard',
      body: 'You’re 14th of 86 this week.',
      action: { href: '/leaderboard?period=all' },
    });
    expect(notificationText({ ...rank, change: -1, rank: 2 })).toMatchObject({
      title: 'You dropped 1 place on the leaderboard',
      body: 'You’re 2nd this week.',
    });
  });

  it('describes a level, a badge and a finished syllabus', () => {
    expect(notificationText({ ...base, kind: 'level_reached', level: 3 })).toMatchObject({
      title: 'You reached Licentiate level',
      body: 'Master starts at 2,500 points.',
    });
    expect(notificationText({ ...base, kind: 'level_reached', level: 5 }).body).toBe(
      'That’s the highest level.',
    );
    expect(notificationText({ ...base, kind: 'badge_earned', badge: 'first_step' })).toMatchObject({
      title: 'You earned the First step badge',
      body: 'First chapter completed.',
      icon: 'footprint',
    });
    expect(notificationText({ ...base, kind: 'syllabus_completed' })).toMatchObject({
      title: 'You finished the SAA-C03 syllabus',
      action: { href: '/catalog/saa-c03' },
    });
  });
});

describe('notificationGroup', () => {
  const now = at('2026-11-13T10:00:00Z');

  it('groups by the Tunis calendar', () => {
    expect(notificationGroup(at('2026-11-13T08:00:00Z'), now)).toBe('today');
    // 23:30 UTC the day before is already today in Tunis.
    expect(notificationGroup(at('2026-11-12T23:30:00Z'), now)).toBe('today');
    expect(notificationGroup(at('2026-11-12T22:30:00Z'), now)).toBe('week');
  });

  it('keeps six days before today in "this week"', () => {
    expect(notificationGroup(at('2026-11-07T12:00:00Z'), now)).toBe('week');
    expect(notificationGroup(at('2026-11-06T12:00:00Z'), now)).toBe('earlier');
  });
});
