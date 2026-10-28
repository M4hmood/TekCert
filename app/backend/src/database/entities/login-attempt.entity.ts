import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Failed sign-ins per email address, including addresses with no account, so a wrong password
 * and an unknown address behave the same way.
 */
@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryColumn({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'smallint', default: 0 })
  failedCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'timestamptz' })
  lastFailedAt!: Date;
}
