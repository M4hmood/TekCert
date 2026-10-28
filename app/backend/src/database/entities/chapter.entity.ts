import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CertificationDomain } from './certification-domain.entity';
import { Certification } from './certification.entity';

@Entity('chapters')
@Unique(['certificationId', 'order'])
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, (cert) => cert.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  @Index()
  @Column({ type: 'uuid' })
  domainId!: string;

  @ManyToOne(() => CertificationDomain, (domain) => domain.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain!: CertificationDomain;

  /** Position in the certification's syllabus, 1-based and unique per certification. */
  @Column({ type: 'smallint' })
  order!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'smallint' })
  estimatedMinutes!: number;
}
