import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from './timestamps';

@Entity('providers')
export class Provider extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'smallint' })
  hue!: number;
}
