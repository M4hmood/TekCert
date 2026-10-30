import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogDetails1793361945833 implements MigrationInterface {
  name = 'AddCatalogDetails1793361945833';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."certification_resource_kind" AS ENUM('doc', 'video', 'lab', 'practice')`,
    );
    await queryRunner.query(
      `CREATE TABLE "certification_resources" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "certification_id" uuid NOT NULL, "order" smallint NOT NULL, "kind" "public"."certification_resource_kind" NOT NULL, "title" character varying(160) NOT NULL, "url" character varying(500) NOT NULL, "duration" character varying(16), CONSTRAINT "UQ_c2382296ef4deac8c8d9d3bd9a4" UNIQUE ("certification_id", "order"), CONSTRAINT "PK_6422866312b3d3252a646419ed9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "preparations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "certification_id" uuid NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_47cbcd3fa6b35044190eea12ae2" UNIQUE ("user_id", "certification_id"), CONSTRAINT "PK_b821aa801c36dc1176084d8ca10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ce6496719f87ed4e30d8d244d" ON "preparations"  ("certification_id") `,
    );
    // Existing rows get an empty summary; the seed fills it in on its next run.
    await queryRunner.query(`ALTER TABLE "certifications" ADD "summary" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "certifications" ALTER COLUMN "summary" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "certifications" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "certifications" ADD "exam_minutes" smallint`);
    await queryRunner.query(`ALTER TABLE "certifications" ADD "question_count" smallint`);
    await queryRunner.query(
      `ALTER TABLE "certifications" ADD "passing_score" character varying(40)`,
    );
    await queryRunner.query(`ALTER TABLE "certifications" ADD "languages" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "certifications" ADD "delivery" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "certifications" ADD "validity_years" smallint`);
    await queryRunner.query(
      `ALTER TABLE "certification_resources" ADD CONSTRAINT "FK_9271cedab99c33f65925205e1b6" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preparations" ADD CONSTRAINT "FK_2b626ef8d70c6dbd612b9a7ddbd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preparations" ADD CONSTRAINT "FK_6ce6496719f87ed4e30d8d244d8" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preparations" DROP CONSTRAINT "FK_6ce6496719f87ed4e30d8d244d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preparations" DROP CONSTRAINT "FK_2b626ef8d70c6dbd612b9a7ddbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certification_resources" DROP CONSTRAINT "FK_9271cedab99c33f65925205e1b6"`,
    );
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "validity_years"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "delivery"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "languages"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "passing_score"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "question_count"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "exam_minutes"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN "summary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ce6496719f87ed4e30d8d244d"`);
    await queryRunner.query(`DROP TABLE "preparations"`);
    await queryRunner.query(`DROP TABLE "certification_resources"`);
    await queryRunner.query(`DROP TYPE "public"."certification_resource_kind"`);
  }
}
