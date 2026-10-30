import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PathNode } from './path-node.entity';
import { Specialty } from '../../school/entities/specialty.entity';
import { Timestamped } from '../../database/timestamped';

export const PATH_KINDS = ['shared', 'specialty'] as const;
export type PathKind = (typeof PATH_KINDS)[number];

@Entity('paths')
@Unique(['specialtyId'])
export class Path extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FOND for the shared Fundamentals path, otherwise the specialty code. */
  @Column({ type: 'varchar', length: 16, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'enum', enum: PATH_KINDS, enumName: 'path_kind' })
  kind!: PathKind;

  @Column({ type: 'uuid', nullable: true })
  specialtyId!: string | null;

  @ManyToOne(() => Specialty, { nullable: true })
  @JoinColumn({ name: 'specialty_id' })
  specialty!: Specialty | null;

  @OneToMany(() => PathNode, (node) => node.path)
  nodes!: PathNode[];
}
