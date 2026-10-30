import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Certification } from './certification.entity';
import { Chapter } from './chapter.entity';

/** An exam domain from the vendor's outline (e.g. "Secure architectures", 30 %). */
@Entity('certification_domains')
@Unique(['certificationId', 'order'])
export class CertificationDomain {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, (cert) => cert.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  @Column({ type: 'smallint' })
  order!: number;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 40 })
  shortTitle!: string;

  /** Exam weight in percent; null when the vendor does not publish weights. */
  @Column({ type: 'smallint', nullable: true })
  weightPct!: number | null;

  @OneToMany(() => Chapter, (chapter) => chapter.domain)
  chapters!: Chapter[];
}
