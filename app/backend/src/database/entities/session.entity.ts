import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * One refresh token. Every refresh creates a new row in the same family and revokes the old one;
 * presenting a revoked token again revokes the whole family (likely theft).
 */
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Shared by every rotation of one sign-in. */
  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  /** SHA-256 of the refresh token; the token itself is never stored. */
  @Column({ type: 'char', length: 64, unique: true })
  tokenHash!: string;

  /** "Stay signed in": persistent cookie and a sliding 30-day expiry. */
  @Column({ type: 'boolean' })
  remember!: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  replacedById!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;
}
