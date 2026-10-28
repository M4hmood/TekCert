import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** createdAt / updatedAt for tables that change over time. */
export abstract class Timestamped {
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
