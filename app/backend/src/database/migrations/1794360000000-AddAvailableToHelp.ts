import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailableToHelp1794360000000 implements MigrationInterface {
  name = 'AddAvailableToHelp1794360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "available_to_help" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "available_to_help"`);
  }
}
