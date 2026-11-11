import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Certification } from './certification.entity';
import { Chapter } from './chapter.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A chapter the student has ticked: the current state of their syllabus. The points it earned
 * live in the `point_events` ledger (progress module), written in the same transaction.
 */
@Entity('chapter_progress')
@Index(['userId', 'certificationId'])
export class ChapterProgress {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @PrimaryColumn({ type: 'uuid' })
  chapterId!: string;

  /** A chapter removed from the seed drops its rows; the points already earned stay. */
  @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapter_id' })
  chapter!: Chapter;

  /** Copied from the chapter so per-certification counts need no join. */
  @Index()
  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  @CreateDateColumn({ type: 'timestamptz' })
  completedAt!: Date;
}
