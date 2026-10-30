import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Specialty } from './specialty.entity';
import { Timestamped } from '../../database/timestamped';

/** A class follows the institute pattern: ING-4-CIM-C (years 4–5) or ING-2-B (years 1–3). */
@Entity('classes')
export class SchoolClass extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @Index()
  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'varchar', length: 8 })
  group!: string;

  @Column({ type: 'uuid', nullable: true })
  specialtyId!: string | null;

  @ManyToOne(() => Specialty, { nullable: true })
  @JoinColumn({ name: 'specialty_id' })
  specialty!: Specialty | null;
}
