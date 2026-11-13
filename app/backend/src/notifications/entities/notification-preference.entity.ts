import { NOTIFICATION_CATEGORIES, type NotificationCategory } from '@tekcert/types';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Timestamped } from '../../database/timestamped';
import { User } from '../../users/entities/user.entity';

/** A student's choice for one category. No row means the defaults (NOTIFICATION_DEFAULTS). */
@Entity('notification_preferences')
export class NotificationPreference extends Timestamped {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @PrimaryColumn({
    type: 'enum',
    enum: NOTIFICATION_CATEGORIES,
    enumName: 'notification_category',
  })
  category!: NotificationCategory;

  @Column({ type: 'boolean' })
  inApp!: boolean;

  @Column({ type: 'boolean' })
  email!: boolean;
}
