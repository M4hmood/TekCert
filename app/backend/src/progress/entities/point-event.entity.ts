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

/** Release 2 adds verified certifications and practice tests. */
export const POINT_REASONS = ['chapter_done', 'chapter_undone'] as const;
export type PointReason = (typeof POINT_REASONS)[number];

/**
 * The points ledger. Rows are only ever added: a database trigger rejects updates and any
 * delete other than the cascade from deleting the user. A student's points are always
 * `SUM(delta)`; no total is stored anywhere.
 */
@Entity('point_events')
@Index(['userId', 'createdAt'])
export class PointEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'smallint' })
  delta!: number;

  @Column({ type: 'enum', enum: POINT_REASONS, enumName: 'point_reason' })
  reason!: PointReason;

  @Column({ type: 'uuid', nullable: true })
  certificationId!: string | null;

  @ManyToOne(() => Certification, { nullable: true })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification | null;

  /** No foreign key: the history outlives a chapter removed from the seed. */
  @Column({ type: 'uuid', nullable: true })
  chapterId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
