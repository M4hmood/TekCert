import { BADGE_KEYS, type BadgeKey } from '@tekcert/types';
import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** A badge the student earned. Kept for good, even if the count behind it drops later. */
@Entity('user_badges')
export class UserBadge {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @PrimaryColumn({ type: 'enum', enum: BADGE_KEYS, enumName: 'badge_key' })
  badge!: BadgeKey;

  @CreateDateColumn({ type: 'timestamptz' })
  earnedAt!: Date;
}
