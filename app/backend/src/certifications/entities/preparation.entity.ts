import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Certification } from './certification.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A student pressed "Start" on a certification: it is in progress. S04 hangs chapter progress
 * and points off this row.
 */
@Entity('preparations')
@Unique(['userId', 'certificationId'])
export class Preparation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Indexed through the unique (user_id, certification_id) constraint. */
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, { nullable: false })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt!: Date;
}
