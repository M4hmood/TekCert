import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboarding1793312042833 implements MigrationInterface {
  name = 'AddOnboarding1793312042833';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_certification_status" AS ENUM('unverified')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_certification_source" AS ENUM('onboarding')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_certifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "certification_id" uuid NOT NULL, "status" "public"."user_certification_status" NOT NULL DEFAULT 'unverified', "source" "public"."user_certification_source" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ece0e270f0e05fd7bc372f53b67" UNIQUE ("user_id", "certification_id"), CONSTRAINT "PK_9951122e9d864429886105c6448" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_38539bc51fc8e2588f8f166603" ON "user_certifications"  ("certification_id") `,
    );
    // Every profile is now visible (decision 2026-10-29). Only dev and test accounts exist before
    // the pilot, so accounts created without the old optional consent are marked as accepted.
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_visible"`);
    await queryRunner.query(
      `UPDATE "users" SET "visibility_consented_at" = "created_at" WHERE "visibility_consented_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "visibility_consented_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "leaderboard_visible" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "target_specialty_id" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar_key" character varying(128)`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboarding_step" smallint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboarding_completed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_23a91ddbd41a7f1cc1bd179624d" FOREIGN KEY ("target_specialty_id") REFERENCES "specialties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_certifications" ADD CONSTRAINT "FK_383baf26f3c062823386c17229f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_certifications" ADD CONSTRAINT "FK_38539bc51fc8e2588f8f166603b" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_certifications" DROP CONSTRAINT "FK_38539bc51fc8e2588f8f166603b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_certifications" DROP CONSTRAINT "FK_383baf26f3c062823386c17229f"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_23a91ddbd41a7f1cc1bd179624d"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_completed_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_step"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "target_specialty_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "leaderboard_visible"`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "visibility_consented_at" DROP NOT NULL`,
    );
    // Everyone accepted visibility, so everyone was visible.
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_visible" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`UPDATE "users" SET "profile_visible" = true`);
    await queryRunner.query(`DROP INDEX "public"."IDX_38539bc51fc8e2588f8f166603"`);
    await queryRunner.query(`DROP TABLE "user_certifications"`);
    await queryRunner.query(`DROP TYPE "public"."user_certification_source"`);
    await queryRunner.query(`DROP TYPE "public"."user_certification_status"`);
  }
}
