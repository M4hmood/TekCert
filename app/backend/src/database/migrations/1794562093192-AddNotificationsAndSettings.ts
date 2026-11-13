import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsAndSettings1794562093192 implements MigrationInterface {
  name = 'AddNotificationsAndSettings1794562093192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notification_category" AS ENUM('community', 'leaderboard', 'progress')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "category" "public"."notification_category" NOT NULL, "in_app" boolean NOT NULL, "email" boolean NOT NULL, CONSTRAINT "PK_5906e7816659c2d55066f409bff" PRIMARY KEY ("user_id", "category"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_kind" AS ENUM('classmates_started', 'rank_changed', 'level_reached', 'badge_earned', 'syllabus_completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "kind" "public"."notification_kind" NOT NULL, "certification_id" uuid, "payload" jsonb NOT NULL DEFAULT '{}', "dedupe_key" character varying(120) NOT NULL, "in_app" boolean NOT NULL DEFAULT true, "read_at" TIMESTAMP WITH TIME ZONE, "emailed_at" TIMESTAMP WITH TIME ZONE, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_unread" ON "notifications"  ("user_id") WHERE "read_at" IS NULL AND "in_app"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_occurred" ON "notifications"  ("user_id", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_user_dedupe" ON "notifications"  ("user_id", "dedupe_key") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."user_theme" AS ENUM('light', 'dark', 'system')`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "theme" "public"."user_theme" NOT NULL DEFAULT 'system'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "enrolment_confirmed_year" smallint`);
    await queryRunner.query(`ALTER TABLE "users" ADD "alumni_since" TIMESTAMP WITH TIME ZONE`);
    // Students already onboarded chose their class in the academic year they joined (it
    // starts on 1 September in Tunis): they are asked again from the next one.
    await queryRunner.query(
      `UPDATE "users" SET "enrolment_confirmed_year" = EXTRACT(YEAR FROM ("onboarding_completed_at" AT TIME ZONE 'Africa/Tunis') - INTERVAL '8 months') WHERE "onboarding_completed_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_64c90edc7310c6be7c10c96f675" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f19a20d4cdfa2af68ba7fc0595" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f19a20d4cdfa2af68ba7fc0595"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_64c90edc7310c6be7c10c96f675"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "alumni_since"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "enrolment_confirmed_year"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "theme"`);
    await queryRunner.query(`DROP TYPE "public"."user_theme"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_notifications_user_dedupe"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_occurred"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_unread"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notification_kind"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TYPE "public"."notification_category"`);
  }
}
