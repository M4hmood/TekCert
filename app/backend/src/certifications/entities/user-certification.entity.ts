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

/** Release 2 adds pending / verified / rejected with proof upload and staff review. */
export const USER_CERTIFICATION_STATUSES = ['unverified'] as const;
export type UserCertificationStatus = (typeof USER_CERTIFICATION_STATUSES)[number];

export const USER_CERTIFICATION_SOURCES = ['onboarding'] as const;
export type UserCertificationSource = (typeof USER_CERTIFICATION_SOURCES)[number];

/** A certification a student says they hold. Unverified ones earn no points (PLAN.md). */
@Entity('user_certifications')
@Unique(['userId', 'certificationId'])
export class UserCertification {
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

  @Column({
    type: 'enum',
    enum: USER_CERTIFICATION_STATUSES,
    enumName: 'user_certification_status',
    default: 'unverified',
  })
  status!: UserCertificationStatus;

  @Column({
    type: 'enum',
    enum: USER_CERTIFICATION_SOURCES,
    enumName: 'user_certification_source',
  })
  source!: UserCertificationSource;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
