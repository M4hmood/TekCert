import { ROLES, type Role } from '@tekcert/types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SchoolClass } from '../../school/entities/school-class.entity';
import { Specialty } from '../../school/entities/specialty.entity';
import { Timestamped } from '../../database/timestamped';

@Entity('users')
export class User extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Stored lowercased; the API normalises before writing. */
  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ type: 'varchar', length: 80 })
  lastName!: string;

  @Column({ type: 'enum', enum: ROLES, enumName: 'user_role', default: 'student' })
  role!: Role;

  /** argon2id hash (PHC string). Never selected unless asked for explicitly. */
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  /** Null until the student opens the link in the verification email. */
  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  /**
   * Every profile is visible to signed-in students; this records when the student accepted that
   * at sign-up (required to create an account).
   */
  @Column({ type: 'timestamptz' })
  visibilityConsentedAt!: Date;

  /** Shown on leaderboards. Opt-out in onboarding and settings. */
  @Column({ type: 'boolean', default: true })
  leaderboardVisible!: boolean;

  /** Set in onboarding step 2. ING-4/5 classes also carry the specialty. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  classId!: string | null;

  @ManyToOne(() => SchoolClass, { nullable: true })
  @JoinColumn({ name: 'class_id' })
  class!: SchoolClass | null;

  /** ING-1…3 only: the specialty the student is aiming for. Null means undecided. */
  @Column({ type: 'uuid', nullable: true })
  targetSpecialtyId!: string | null;

  @ManyToOne(() => Specialty, { nullable: true })
  @JoinColumn({ name: 'target_specialty_id' })
  targetSpecialty!: Specialty | null;

  /** Object key of the profile photo in storage; it contains a content hash, so it changes with the photo. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  avatarKey!: string | null;

  /** The furthest onboarding step reached (1–5): the wizard resumes there. */
  @Column({ type: 'smallint', default: 1 })
  onboardingStep!: number;

  @Column({ type: 'timestamptz', nullable: true })
  onboardingCompletedAt!: Date | null;
}
