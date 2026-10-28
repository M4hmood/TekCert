import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Certification } from './certification.entity';
import { Path } from './path.entity';

/** A certification placed on a path graph (column = progression, row = track). */
@Entity('path_nodes')
@Unique(['pathId', 'certificationId'])
@Unique(['pathId', 'col', 'row'])
export class PathNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pathId!: string;

  @ManyToOne(() => Path, (path) => path.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'path_id' })
  path!: Path;

  @Column({ type: 'uuid' })
  certificationId!: string;

  @ManyToOne(() => Certification, { nullable: false })
  @JoinColumn({ name: 'certification_id' })
  certification!: Certification;

  @Column({ type: 'smallint' })
  col!: number;

  @Column({ type: 'smallint' })
  row!: number;

  /** Locks this node until the prerequisite certification is earned. */
  @Column({ type: 'uuid', nullable: true })
  prerequisiteId!: string | null;

  @ManyToOne(() => Certification, { nullable: true })
  @JoinColumn({ name: 'prerequisite_id' })
  prerequisite!: Certification | null;
}
