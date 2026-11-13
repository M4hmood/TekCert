import { NOTIFICATION_KINDS, type NotificationKind } from '@tekcert/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Certification } from '../../certifications/entities/certification.entity';
import { User } from '../../users/entities/user.entity';

/** What a notification needs besides its kind and certification. */
export interface NotificationPayload {
  /** classmates_started */
  count?: number;
  names?: string[];
  /** rank_changed */
  rank?: number;
  total?: number;
  change?: number;
  board?: string | null;
  /** level_reached */
  level?: number;
  /** badge_earned */
  badge?: string;
}

/**
 * One thing a student is told about. `dedupeKey` names the event behind it ("level:3",
 * "rank:2026-11-16"), unique per student: a retry, or the same job on a second server, can't
 * tell them twice.
 */
@Entity('notifications')
@Index('UQ_notifications_user_dedupe', ['userId', 'dedupeKey'], { unique: true })
@Index('IDX_notifications_user_occurred', ['userId', 'occurredAt'])
@Index('IDX_notifications_unread', ['userId'], { where: `"read_at" IS NULL AND "in_app"` })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: NOTIFICATION_KINDS, enumName: 'notification_kind' })
  kind!: NotificationKind;

  @Column({ type: 'uuid', nullable: true })
  certificationId!: string | null;

  @ManyToOne(() => Certification, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  payload!: NotificationPayload;

  @Column({ type: 'varchar', length: 120 })
  dedupeKey!: string;

  /** False when the student only wants this category by email: kept to dedupe, never listed. */
  @Column({ type: 'boolean', default: true })
  inApp!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailedAt!: Date | null;

  /** The list's order. A roll-up moves up when it grows. */
  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
