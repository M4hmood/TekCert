import { ACTIVITY_KINDS, type ActivityKind, BADGE_KEYS, type BadgeKey } from '@tekcert/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Certification } from '../../certifications/entities/certification.entity';
import { User } from '../../users/entities/user.entity';

/**
 * One line of the classmates feed. `chapters_done` is a daily roll-up per certification whose
 * `count` follows ticks and unticks; every other kind is written once (partial unique indexes).
 */
@Entity('activity_events')
@Index(['updatedAt'])
@Index('UQ_activity_chapters_day', ['userId', 'certificationId', 'day'], {
  unique: true,
  where: `"kind" = 'chapters_done'`,
})
@Index('UQ_activity_once_per_certification', ['userId', 'kind', 'certificationId'], {
  unique: true,
  where: `"kind" IN ('certification_started', 'syllabus_completed')`,
})
@Index('UQ_activity_level', ['userId', 'level'], {
  unique: true,
  where: `"kind" = 'level_reached'`,
})
@Index('UQ_activity_badge', ['userId', 'badge'], {
  unique: true,
  where: `"kind" = 'badge_earned'`,
})
export class ActivityEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ACTIVITY_KINDS, enumName: 'activity_kind' })
  kind!: ActivityKind;

  @Column({ type: 'uuid', nullable: true })
  certificationId!: string | null;

  @ManyToOne(() => Certification, { nullable: true })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification | null;

  @Column({ type: 'enum', enum: BADGE_KEYS, enumName: 'badge_key', nullable: true })
  badge!: BadgeKey | null;

  /** level_reached: the rank (2–5). */
  @Column({ type: 'smallint', nullable: true })
  level!: number | null;

  /** chapters_done: chapters ticked that day, net of unticks. Hidden at 0. */
  @Column({ type: 'smallint', nullable: true })
  count!: number | null;

  /** chapters_done: the day in Tunis time, YYYY-MM-DD. */
  @Column({ type: 'date', nullable: true })
  day!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /** The feed's order: a roll-up moves up when another chapter is ticked that day. */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
