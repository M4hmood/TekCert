import { CERTIFICATION_LEVELS, type CertificationLevel } from '@tekcert/types';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  VirtualColumn,
} from 'typeorm';
import { CertificationDomain } from './certification-domain.entity';
import { Chapter } from './chapter.entity';
import { Provider } from './provider.entity';
import { Specialty } from '../../school/entities/specialty.entity';
import { Timestamped } from '../../database/timestamped';

@Entity('certifications')
@Check('certification_difficulty_range', '"difficulty" BETWEEN 1 AND 5')
export class Certification extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Display code, unique across providers (e.g. SAA-C03, OCA-JAVA). */
  @Column({ type: 'varchar', length: 24, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  /** Vendor exam number when it differs from the display code (e.g. EX200, 1Z0-808). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  examCode!: string | null;

  @Index()
  @Column({ type: 'enum', enum: CERTIFICATION_LEVELS, enumName: 'certification_level' })
  level!: CertificationLevel;

  @Column({ type: 'smallint' })
  difficulty!: number;

  @Column({ type: 'boolean', default: false })
  forAllSpecialties!: boolean;

  @Column({ type: 'varchar', length: 160, nullable: true })
  badgeAsset!: string | null;

  /** Certifications removed from the catalog are deactivated, never deleted. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Index()
  @Column({ type: 'uuid' })
  providerId!: string;

  @ManyToOne(() => Provider, { nullable: false })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @ManyToMany(() => Specialty)
  @JoinTable({
    name: 'certification_specialties',
    joinColumn: { name: 'certification_id' },
    inverseJoinColumn: { name: 'specialty_id' },
  })
  specialties!: Specialty[];

  @OneToMany(() => CertificationDomain, (domain) => domain.certification)
  domains!: CertificationDomain[];

  @OneToMany(() => Chapter, (chapter) => chapter.certification)
  chapters!: Chapter[];

  @VirtualColumn({
    type: 'int',
    query: (alias) => `SELECT COUNT(*) FROM "chapters" WHERE "certification_id" = ${alias}."id"`,
    transformer: { from: (value: unknown) => Number(value), to: (value: unknown) => value },
  })
  chapterCount!: number;
}
