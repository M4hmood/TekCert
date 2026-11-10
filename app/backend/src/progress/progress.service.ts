import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  type BadgeKey,
  badgesForChapters,
  type ChapterTickResult,
  levelFor,
  type MyCertification,
  percentDone,
  POINTS_PER_CHAPTER,
} from '@tekcert/types';
import type { DataSource } from 'typeorm';
import { CertificationsService } from '../certifications/certifications.service';
import { CLOCK, type Clock } from '../common/utils/clock';
import { ActivityService } from './activity.service';
import { PointsService } from './points.service';
import { tunisDay } from './utils/labels';

/** Starting a certification and ticking its chapters: state, ledger, badges and feed together. */
@Injectable()
export class ProgressService {
  constructor(
    private readonly certifications: CertificationsService,
    private readonly points: PointsService,
    private readonly activity: ActivityService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** "Start" (S03), now also announced in the classmates feed the first time. */
  async start(userId: string, slug: string): Promise<MyCertification & { created: boolean }> {
    const { certificationId, ...status } = await this.certifications.start(userId, slug);
    if (status.created) {
      await this.activity.recordOnce({ userId, kind: 'certification_started', certificationId });
    }
    return status;
  }

  /**
   * Ticks (`done`) or unticks a chapter. A change writes the chapter state, one ledger row and
   * the feed roll-up in one transaction; ticking a chapter already ticked writes nothing.
   */
  async setChapter(userId: string, chapterId: string, done: boolean): Promise<ChapterTickResult> {
    return this.dataSource.transaction(async (manager) => {
      const change = await this.certifications.setChapterDone(userId, chapterId, done, manager);
      const delta = change.changed ? (done ? POINTS_PER_CHAPTER : -POINTS_PER_CHAPTER) : 0;
      if (change.changed) {
        await this.points.record(manager, {
          userId,
          delta,
          reason: done ? 'chapter_done' : 'chapter_undone',
          certificationId: change.certificationId,
          chapterId,
        });
        if (done) {
          await this.activity.chapterDone(
            manager,
            userId,
            change.certificationId,
            tunisDay(this.clock.now()),
          );
        } else {
          await this.activity.chapterUndone(manager, userId, change.certificationId);
        }
      }

      const points = await this.points.total(userId, manager);
      const level = levelFor(points);
      let newBadges: BadgeKey[] = [];
      if (change.changed && done) {
        const completed = await this.certifications.completedChapterCount(userId, manager);
        newBadges = await this.points.award(manager, userId, badgesForChapters(completed));
        for (const badge of newBadges) {
          await this.activity.recordOnce({ userId, kind: 'badge_earned', badge }, manager);
        }
        // Written the first time a level is reached only, so unticking and re-ticking around a
        // threshold doesn't repeat it.
        if (level.rank > 1) {
          await this.activity.recordOnce(
            { userId, kind: 'level_reached', level: level.rank },
            manager,
          );
        }
        if (change.total > 0 && change.done === change.total) {
          await this.activity.recordOnce(
            { userId, kind: 'syllabus_completed', certificationId: change.certificationId },
            manager,
          );
        }
      }

      return {
        changed: change.changed,
        delta,
        certification: {
          slug: change.slug,
          done: change.done,
          total: change.total,
          pct: percentDone(change.done, change.total),
        },
        points,
        level,
        newBadges,
      };
    });
  }
}
