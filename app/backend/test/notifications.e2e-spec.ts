import { randomUUID } from 'node:crypto';
import {
  CertificationDetailSchema,
  type Notification,
  NOTIFICATION_PAGE_SIZE,
  NotificationListSchema,
  NotificationPreferencesSchema,
  notificationText,
  UnreadCountSchema,
} from '@tekcert/types';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RankDigestService } from '../src/leaderboard/rank-digest.service';
import { createTestApp, eventually, onboardedStudent, type TestApp, travelTo } from './test-app';

type Agent = ReturnType<typeof request.agent>;

/**
 * Every notification here comes from the real event behind it: starting a certification,
 * ticking chapters, or the weekly leaderboard run. Classes are ones no other suite uses, so
 * "classmates" are exactly the students a test created.
 */
describe('Notifications (e2e)', () => {
  let t: TestApp;
  let db: DataSource;
  const DAY = 86_400_000;

  beforeAll(async () => {
    t = await createTestApp();
    db = t.app.get(DataSource);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const list = async (agent: Agent, query: Record<string, string> = {}) =>
    NotificationListSchema.parse(
      (await agent.get('/me/notifications').query(query).expect(200)).body,
    );
  const unread = async (agent: Agent) =>
    UnreadCountSchema.parse((await agent.get('/me/notifications/unread-count').expect(200)).body)
      .unread;
  const ofKind = (items: Notification[], kind: Notification['kind']) =>
    items.filter((item) => item.kind === kind);
  const setPreference = (
    agent: Agent,
    category: string,
    channels: { inApp: boolean; email: boolean },
  ) =>
    agent
      .put('/me/notification-preferences')
      .send({ items: [{ category, ...channels }] })
      .expect(200);
  const chaptersOf = async (slug: string): Promise<string[]> => {
    const detail = CertificationDetailSchema.parse(
      (await request(t.app.getHttpServer()).get(`/certifications/${slug}`).expect(200)).body,
    );
    return detail.domains.flatMap((d) => d.chapters).map((c) => c.id);
  };
  const start = (agent: Agent, slug: string) => agent.put(`/me/preparations/${slug}`).expect(201);
  const tick = (agent: Agent, chapterId: string | undefined) =>
    agent.put(`/me/chapters/${chapterId ?? ''}`).expect(200);
  /** Ledger rows written at a past date: the API always writes "now". */
  const earnedAt = (userId: string, points: number, at: Date) =>
    db.query(
      `INSERT INTO point_events (user_id, delta, reason, created_at)
       VALUES ($1, $2, 'chapter_done', $3)`,
      [userId, points, at],
    );
  const mailsTo = (email: string) => t.mail.sent.filter((mail) => mail.to === email);
  /** The emails are sent in the background: wait for one, by subject. */
  const mailTo = (email: string, subject: string) =>
    eventually(
      () => mailsTo(email).find((mail) => mail.subject === subject),
      `the email "${subject}"`,
    );

  it('is for signed-in students only', async () => {
    const server = t.app.getHttpServer();
    await request(server).get('/me/notifications').expect(401);
    await request(server).get('/me/notifications/unread-count').expect(401);
    await request(server).post('/me/notifications/read-all').expect(401);
    await request(server).put(`/me/notifications/${randomUUID()}/read`).expect(401);
    await request(server).get('/me/notification-preferences').expect(401);
    await request(server)
      .put('/me/notification-preferences')
      .send({ items: [{ category: 'progress', inApp: false, email: false }] })
      .expect(401);
  });

  describe('progress', () => {
    it('tells me about my first badge, in the app and by email', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      expect(await list(me.agent)).toEqual({ items: [], nextCursor: null, unread: 0 });

      await start(me.agent, 'az-900');
      const [first, second] = await chaptersOf('az-900');
      await tick(me.agent, first);
      await tick(me.agent, second);

      const mine = await list(me.agent);
      expect(mine.unread).toBe(1);
      expect(mine.items).toHaveLength(1);
      expect(mine.items[0]).toMatchObject({
        kind: 'badge_earned',
        category: 'progress',
        badge: 'first_step',
        read: false,
        certification: null,
      });
      const mail = await mailTo(me.email, 'You earned the First step badge');
      expect(mail.text).toContain('First chapter completed.');
      expect(mail.text).toContain('http://localhost:3000/profile');
      expect(mail.text).toContain('http://localhost:3000/settings/notifications');
      expect(mail.html).toContain('Choose which emails you get');
      // One badge, one email: the second tick earned nothing new.
      expect(mailsTo(me.email).filter((m) => m.subject.includes('badge'))).toHaveLength(1);
    });

    it('tells me once when I reach a level, even around the threshold', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await start(me.agent, 'az-900');
      const [first, second] = await chaptersOf('az-900');
      // 240 points from earlier chapters: the next tick reaches Bachelor (250).
      await db.query(
        `INSERT INTO point_events (user_id, delta, reason)
         SELECT $1, 10, 'chapter_done' FROM generate_series(1, 24)`,
        [me.id],
      );
      await tick(me.agent, first);
      await me.agent.delete(`/me/chapters/${first ?? ''}`).expect(200);
      await tick(me.agent, first);
      await tick(me.agent, second);

      const levels = ofKind((await list(me.agent)).items, 'level_reached');
      expect(levels).toHaveLength(1);
      expect(levels[0]).toMatchObject({ level: 2, category: 'progress' });
      expect(notificationText(levels[0] as Notification).title).toBe('You reached Bachelor level');
      await mailTo(me.email, 'You reached Bachelor level');
    });

    it('tells me when I finish a syllabus', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await start(me.agent, 'az-900');
      const chapters = await chaptersOf('az-900');
      for (const chapter of chapters.slice(0, -1)) await tick(me.agent, chapter);
      expect(ofKind((await list(me.agent)).items, 'syllabus_completed')).toHaveLength(0);

      await tick(me.agent, chapters.at(-1));
      const finished = ofKind((await list(me.agent)).items, 'syllabus_completed');
      expect(finished).toHaveLength(1);
      expect(finished[0]?.certification).toEqual({ code: 'AZ-900', slug: 'az-900' });
      const mail = await mailTo(me.email, 'You finished the AZ-900 syllabus');
      expect(mail.text).toContain('http://localhost:3000/catalog/az-900');
    });
  });

  describe('preferences', () => {
    it('starts from the defaults and saves what I change', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      const before = NotificationPreferencesSchema.parse(
        (await me.agent.get('/me/notification-preferences').expect(200)).body,
      );
      expect(before.items).toEqual([
        { category: 'community', inApp: true, email: false },
        { category: 'leaderboard', inApp: true, email: false },
        { category: 'progress', inApp: true, email: true },
      ]);

      const saved = NotificationPreferencesSchema.parse(
        (await setPreference(me.agent, 'community', { inApp: false, email: true })).body,
      );
      expect(saved.items[0]).toEqual({ category: 'community', inApp: false, email: true });
      expect(saved.items[2]).toEqual(before.items[2]);

      // Saving again replaces the choice instead of adding a second one.
      await setPreference(me.agent, 'community', { inApp: true, email: true });
      const again = NotificationPreferencesSchema.parse(
        (await me.agent.get('/me/notification-preferences').expect(200)).body,
      );
      expect(again.items[0]).toEqual({ category: 'community', inApp: true, email: true });
    });

    it('refuses unknown categories and incomplete rows', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      for (const items of [
        [],
        [{ category: 'requests', inApp: true, email: true }],
        [{ category: 'progress', inApp: true }],
        [
          { category: 'progress', inApp: true, email: true },
          { category: 'progress', inApp: false, email: true },
        ],
      ]) {
        await me.agent.put('/me/notification-preferences').send({ items }).expect(400);
      }
    });

    it('writes nothing and sends nothing for a category switched off', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await setPreference(me.agent, 'progress', { inApp: false, email: false });
      await start(me.agent, 'az-900');
      await tick(me.agent, (await chaptersOf('az-900'))[0]);

      expect((await list(me.agent)).items).toEqual([]);
      const rows = await db.query<unknown[]>('SELECT id FROM notifications WHERE user_id = $1', [
        me.id,
      ]);
      expect(rows).toHaveLength(0);
      // Give a background send the time it would have needed.
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mailsTo(me.email).filter((m) => m.subject.includes('badge'))).toHaveLength(0);
    });

    it('sends the email without listing it when only email is on', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await setPreference(me.agent, 'progress', { inApp: false, email: true });
      await start(me.agent, 'az-900');
      await tick(me.agent, (await chaptersOf('az-900'))[0]);

      await mailTo(me.email, 'You earned the First step badge');
      expect(await list(me.agent)).toEqual({ items: [], nextCursor: null, unread: 0 });
    });

    it('lists it without an email when only the app is on', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'A' });
      await setPreference(me.agent, 'progress', { inApp: true, email: false });
      await start(me.agent, 'az-900');
      await tick(me.agent, (await chaptersOf('az-900'))[0]);

      expect(ofKind((await list(me.agent)).items, 'badge_earned')).toHaveLength(1);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mailsTo(me.email).filter((m) => m.subject.includes('badge'))).toHaveLength(0);
    });
  });

  describe('classmates', () => {
    it('tells classmates preparing the same certification, rolled up per day', async () => {
      const klass = { year: 5, specialty: 'AIOT', group: 'B' };
      const me = await onboardedStudent(t, klass, [], { firstName: 'Yassine' });
      const mehdi = await onboardedStudent(t, klass, [], { firstName: 'Mehdi' });
      const hidden = await onboardedStudent(t, klass, [], { firstName: 'Salma' });
      const elsewhere = await onboardedStudent(t, { ...klass, group: 'C' }, [], {
        firstName: 'Karim',
      });
      const bystander = await onboardedStudent(t, klass, [], { firstName: 'Rania' });
      await hidden.agent.patch('/me/profile').send({ leaderboardVisible: false }).expect(200);
      await setPreference(me.agent, 'community', { inApp: true, email: true });

      // Nobody else prepares it yet: my own start tells no one, me included.
      await start(me.agent, 'clf-c02');
      expect((await list(me.agent)).items).toEqual([]);

      await start(mehdi.agent, 'clf-c02');
      const first = ofKind((await list(me.agent)).items, 'classmates_started');
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({
        category: 'community',
        count: 1,
        names: ['Mehdi'],
        read: false,
        certification: { code: 'CLF-C02', slug: 'clf-c02' },
      });
      expect(notificationText(first[0] as Notification).title).toBe('Mehdi started CLF-C02');
      const mail = await mailTo(me.email, 'Mehdi started CLF-C02');
      expect(mail.text).toContain('http://localhost:3000/catalog/clf-c02?tab=community');

      // I read it; a second classmate that day raises the same line and makes it unread again.
      await me.agent.put(`/me/notifications/${first[0]?.id ?? ''}/read`).expect(200);
      expect(await unread(me.agent)).toBe(0);
      await start(hidden.agent, 'clf-c02');
      const second = ofKind((await list(me.agent)).items, 'classmates_started');
      expect(second).toHaveLength(1);
      // The student who hides their name is counted, never named.
      expect(second[0]).toMatchObject({
        id: first[0]?.id,
        count: 2,
        names: ['Mehdi'],
        read: false,
      });
      expect(notificationText(second[0] as Notification)).toMatchObject({
        title: '2 students in your class started CLF-C02',
        body: 'Mehdi and 1 other are preparing the same certification as you.',
      });
      expect(JSON.stringify(second)).not.toContain('Salma');
      // The email went out with the first classmate only.
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mailsTo(me.email).filter((m) => m.subject.includes('CLF-C02'))).toHaveLength(1);

      // Another class starting it changes nothing for me.
      await start(elsewhere.agent, 'clf-c02');
      expect(ofKind((await list(me.agent)).items, 'classmates_started')[0]?.count).toBe(2);

      // Mehdi was told about Salma (anonymously), not about himself; a classmate who doesn't
      // prepare it is told nothing.
      const mehdis = ofKind((await list(mehdi.agent)).items, 'classmates_started');
      expect(mehdis).toHaveLength(1);
      expect(mehdis[0]).toMatchObject({ count: 1, names: [] });
      expect(notificationText(mehdis[0] as Notification).title).toBe(
        'A student in your class started CLF-C02',
      );
      expect(ofKind((await list(bystander.agent)).items, 'classmates_started')).toEqual([]);
      // Community emails are off unless switched on.
      expect(mailsTo(mehdi.email).filter((m) => m.subject.includes('CLF-C02'))).toHaveLength(0);
    });

    it('starts a new line the next day', async () => {
      const klass = { year: 5, specialty: 'AIOT', group: 'D' };
      const me = await onboardedStudent(t, klass);
      const today = await onboardedStudent(t, klass, [], { firstName: 'Omar' });
      const tomorrow = await onboardedStudent(t, klass, [], { firstName: 'Ines' });
      await start(me.agent, 'clf-c02');
      await start(today.agent, 'clf-c02');
      await travelTo(t, new Date(Date.now() + DAY), tomorrow);
      await start(tomorrow.agent, 'clf-c02');
      t.clock.reset();

      const lines = ofKind((await list(me.agent)).items, 'classmates_started');
      expect(lines.map((line) => line.names)).toEqual([['Ines'], ['Omar']]);
    });
  });

  describe('the weekly leaderboard run', () => {
    it('tells students whose rank moved, once, and leaves alumni out', async () => {
      const klass = { year: 5, specialty: 'AIOT', group: 'C' };
      const riser = await onboardedStudent(t, klass, [], { firstName: 'Riser' });
      const faller = await onboardedStudent(t, klass, [], { firstName: 'Faller' });
      const steady = await onboardedStudent(t, klass, [], { firstName: 'Steady' });
      const alumnus = await onboardedStudent(t, klass, [], { firstName: 'Alumnus' });
      await faller.agent.patch('/me/profile').send({ leaderboardVisible: false }).expect(200);
      await setPreference(riser.agent, 'leaderboard', { inApp: true, email: true });

      // Far above every other student of the AIOT board, so these four hold its top places.
      const tenDaysAgo = new Date(Date.now() - 10 * DAY);
      await earnedAt(alumnus.id, 30_000, tenDaysAgo);
      await earnedAt(faller.id, 20_000, tenDaysAgo);
      await earnedAt(riser.id, 19_000, tenDaysAgo);
      await earnedAt(steady.id, 15_000, tenDaysAgo);
      // This week the riser overtakes the faller; the alumnus has left TEK-UP.
      await earnedAt(riser.id, 2_000, new Date(Date.now() - 2 * DAY));
      await alumnus.agent.post('/me/academic-year').send({ status: 'left' }).expect(200);

      const digest = t.app.get(RankDigestService);
      expect(await digest.run()).toBeGreaterThanOrEqual(2);

      const up = ofKind((await list(riser.agent)).items, 'rank_changed');
      expect(up).toHaveLength(1);
      expect(up[0]).toMatchObject({ category: 'leaderboard', rank: 1, change: 1, board: 'AIOT' });
      expect(up[0]?.total).toBeGreaterThanOrEqual(3);
      expect(notificationText(up[0] as Notification).title).toBe(
        'You moved up 1 place on the AIOT leaderboard',
      );
      // A student who hides their name is still told about their own rank.
      const down = ofKind((await list(faller.agent)).items, 'rank_changed');
      expect(down).toHaveLength(1);
      expect(down[0]).toMatchObject({ rank: 2, change: -1 });
      expect(notificationText(down[0] as Notification).title).toBe(
        'You dropped 1 place on the AIOT leaderboard',
      );
      expect(ofKind((await list(steady.agent)).items, 'rank_changed')).toEqual([]);
      expect(ofKind((await list(alumnus.agent)).items, 'rank_changed')).toEqual([]);

      const mail = await mailTo(riser.email, 'You moved up 1 place on the AIOT leaderboard');
      expect(mail.text).toContain('http://localhost:3000/leaderboard?period=all');

      // A second run the same day (a retry, or a second server) tells nobody twice.
      await digest.run();
      expect(ofKind((await list(riser.agent)).items, 'rank_changed')).toHaveLength(1);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mailsTo(riser.email).filter((m) => m.subject.includes('moved up'))).toHaveLength(1);
      expect(mailsTo(faller.email).filter((m) => m.subject.includes('dropped'))).toHaveLength(0);
    });
  });

  describe('reading', () => {
    /** Notifications written straight to the table, `minutesAgo` apart, newest first. */
    const seed = async (userId: string, count: number, kind = 'level_reached') => {
      for (let i = 0; i < count; i++) {
        await db.query(
          `INSERT INTO notifications (user_id, kind, payload, dedupe_key, occurred_at)
           VALUES ($1, $2, $3::jsonb, $4, $5)`,
          [
            userId,
            kind,
            JSON.stringify(kind === 'level_reached' ? { level: 2 } : { rank: 3, change: 1 }),
            `test:${kind}:${i}`,
            new Date(Date.now() - i * 60_000),
          ],
        );
      }
    };

    it('pages 20 at a time, newest first, without repeating a line', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'B' });
      await seed(me.id, NOTIFICATION_PAGE_SIZE + 5);

      const first = await list(me.agent);
      expect(first.items).toHaveLength(NOTIFICATION_PAGE_SIZE);
      expect(first.unread).toBe(NOTIFICATION_PAGE_SIZE + 5);
      expect(first.nextCursor).not.toBeNull();
      const times = first.items.map((item) => item.at);
      expect(times).toEqual([...times].sort().reverse());

      const second = await list(me.agent, { cursor: first.nextCursor ?? '' });
      expect(second.items).toHaveLength(5);
      expect(second.nextCursor).toBeNull();
      const ids = new Set([...first.items, ...second.items].map((item) => item.id));
      expect(ids.size).toBe(NOTIFICATION_PAGE_SIZE + 5);

      await me.agent.get('/me/notifications').query({ cursor: 'not-a-cursor' }).expect(400);
      await me.agent.get('/me/notifications').query({ filter: 'requests' }).expect(400);
    });

    it('filters by category and by unread, and marks one or all as read', async () => {
      const me = await onboardedStudent(t, { year: 3, targetSpecialty: 'AIOT', group: 'B' });
      await seed(me.id, 2, 'level_reached');
      await seed(me.id, 1, 'rank_changed');

      expect((await list(me.agent, { filter: 'progress' })).items).toHaveLength(2);
      expect((await list(me.agent, { filter: 'leaderboard' })).items).toHaveLength(1);
      expect((await list(me.agent, { filter: 'community' })).items).toHaveLength(0);
      const all = await list(me.agent, { filter: 'unread' });
      expect(all.items).toHaveLength(3);

      const one = all.items[0]?.id ?? '';
      expect(
        UnreadCountSchema.parse(
          (await me.agent.put(`/me/notifications/${one}/read`).expect(200)).body,
        ),
      ).toEqual({ unread: 2 });
      // Reading it again changes nothing.
      await me.agent.put(`/me/notifications/${one}/read`).expect(200);
      const stillUnread = await list(me.agent, { filter: 'unread' });
      expect(stillUnread.items.map((item) => item.id)).not.toContain(one);
      expect(stillUnread.unread).toBe(2);
      // The category filters still count every unread line.
      expect((await list(me.agent, { filter: 'community' })).unread).toBe(2);

      expect(
        UnreadCountSchema.parse(
          (await me.agent.post('/me/notifications/read-all').expect(200)).body,
        ),
      ).toEqual({ unread: 0 });
      expect((await list(me.agent, { filter: 'unread' })).items).toEqual([]);
      expect((await list(me.agent)).items.every((item) => item.read)).toBe(true);
    });

    it('never shows or changes another student’s notifications', async () => {
      const klass = { year: 3, targetSpecialty: 'AIOT', group: 'C' };
      const me = await onboardedStudent(t, klass);
      const other = await onboardedStudent(t, klass);
      await seed(me.id, 2);
      const mine = (await list(me.agent)).items;

      expect((await list(other.agent)).items).toEqual([]);
      expect(await unread(other.agent)).toBe(0);
      // Someone else's id answers like an unknown one.
      await other.agent.put(`/me/notifications/${mine[0]?.id ?? ''}/read`).expect(404);
      await other.agent.put(`/me/notifications/${randomUUID()}/read`).expect(404);
      await other.agent.put('/me/notifications/not-an-id/read').expect(400);
      await other.agent.post('/me/notifications/read-all').expect(200);

      expect(await unread(me.agent)).toBe(2);
      expect((await list(me.agent)).items.every((item) => !item.read)).toBe(true);
    });
  });
});
