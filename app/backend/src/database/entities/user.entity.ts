import { ROLES, type Role } from '@tekcert/types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SchoolClass } from './school-class.entity';
import { Timestamped } from './timestamps';

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

  /** Visible to other students in community and rankings. Opt-in at sign-up, editable later. */
  @Column({ type: 'boolean', default: false })
  profileVisible!: boolean;

  /** When the student last gave visibility consent (null if never). */
  @Column({ type: 'timestamptz', nullable: true })
  visibilityConsentedAt!: Date | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  classId!: string | null;

  @ManyToOne(() => SchoolClass, { nullable: true })
  @JoinColumn({ name: 'class_id' })
  class!: SchoolClass | null;
}
