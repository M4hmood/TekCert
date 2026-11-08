import { RESOURCE_KINDS, type ResourceKind } from '@tekcert/types';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Certification } from './certification.entity';

/** A recommended external link (TekCert hosts no courses). Replaced on every seed run. */
@Entity('certification_resources')
@Unique(['certificationId', 'order'])
export class CertificationResource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, (cert) => cert.resources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  /** Position in the Resources tab, 1-based. */
  @Column({ type: 'smallint' })
  order!: number;

  @Column({ type: 'enum', enum: RESOURCE_KINDS, enumName: 'certification_resource_kind' })
  kind!: ResourceKind;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  /** Rough time to go through it, e.g. "3 h". */
  @Column({ type: 'varchar', length: 16, nullable: true })
  duration!: string | null;
}
