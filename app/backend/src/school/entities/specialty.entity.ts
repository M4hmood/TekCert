import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../database/timestamped';

@Entity('specialties')
export class Specialty extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** SDIA, CIM, GLOps, SSIR, AIOT or DMWM. */
  @Column({ type: 'varchar', length: 16, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** oklch hue used for tags, avatars and path accents. */
  @Column({ type: 'smallint' })
  hue!: number;
}
