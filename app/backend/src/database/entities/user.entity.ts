import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SchoolClass } from './school-class.entity';
import { Timestamped } from './timestamps';

export const ROLES = ['student', 'staff', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Sprint 0 keeps users bare; credentials and sessions arrive with authentication (S01). */
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

  @Index()
  @Column({ type: 'uuid', nullable: true })
  classId!: string | null;

  @ManyToOne(() => SchoolClass, { nullable: true })
  @JoinColumn({ name: 'class_id' })
  class!: SchoolClass | null;
}
