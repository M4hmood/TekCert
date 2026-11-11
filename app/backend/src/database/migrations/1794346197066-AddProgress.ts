import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgress1794346197066 implements MigrationInterface {
  name = 'AddProgress1794346197066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chapter_progress" ("user_id" uuid NOT NULL, "chapter_id" uuid NOT NULL, "certification_id" uuid NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d49a505d72f84acb0909348d5cc" PRIMARY KEY ("user_id", "chapter_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bab97664e91324a28d757cf086" ON "chapter_progress"  ("certification_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44395bed795a1620ced493cc49" ON "chapter_progress"  ("user_id", "certification_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_kind" AS ENUM('certification_started', 'chapters_done', 'syllabus_completed', 'badge_earned', 'level_reached')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badge_key" AS ENUM('first_step', 'pioneer', 'flawless', 'multi_cloud', 'dedicated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "kind" "public"."activity_kind" NOT NULL, "certification_id" uuid, "badge" "public"."badge_key", "level" smallint, "count" smallint, "day" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f8e8d9dbf64f93f58ae52b4a9e4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activity_badge" ON "activity_events"  ("user_id", "badge") WHERE "kind" = 'badge_earned'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activity_level" ON "activity_events"  ("user_id", "level") WHERE "kind" = 'level_reached'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activity_once_per_certification" ON "activity_events"  ("user_id", "kind", "certification_id") WHERE "kind" IN ('certification_started', 'syllabus_completed')`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activity_chapters_day" ON "activity_events"  ("user_id", "certification_id", "day") WHERE "kind" = 'chapters_done'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5308c0d6d4919607a7e7ab0920" ON "activity_events"  ("updated_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."point_reason" AS ENUM('chapter_done', 'chapter_undone')`,
    );
    await queryRunner.query(
      `CREATE TABLE "point_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "delta" smallint NOT NULL, "reason" "public"."point_reason" NOT NULL, "certification_id" uuid, "chapter_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_14cbd6b4e90db5df8728df1ce94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de5f922596a799290c5861caa7" ON "point_events"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_badges" ("user_id" uuid NOT NULL, "badge" "public"."badge_key" NOT NULL, "earned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b575efa2c1fbf6ffa17fdd811a9" PRIMARY KEY ("user_id", "badge"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" ADD CONSTRAINT "FK_3796b7939c2bb68b3355b079ca8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" ADD CONSTRAINT "FK_350dd97812aa0f321f212585fd7" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" ADD CONSTRAINT "FK_bab97664e91324a28d757cf0866" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_events" ADD CONSTRAINT "FK_6b7520c53f24fe26f14807e811d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_events" ADD CONSTRAINT "FK_041a95c7f7867516dfa0ed79b00" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_events" ADD CONSTRAINT "FK_e8c5d388e38d5eab2767a5f6484" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_events" ADD CONSTRAINT "FK_6b9397ef6fe37cc78b47f03b924" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // badge_key is shared by activity_events and user_badges: created once above.
    // The ledger is append-only. Updates are refused; deletes only come through the cascade
    // from deleting a user (a foreign-key action runs one trigger level deeper).
    await queryRunner.query(`CREATE FUNCTION "point_events_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'point_events is append-only (% refused)', TG_OP USING ERRCODE = 'restrict_violation';
END
$$`);
    await queryRunner.query(
      `CREATE TRIGGER "point_events_append_only" BEFORE UPDATE OR DELETE ON "point_events" FOR EACH ROW EXECUTE FUNCTION "point_events_append_only"()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "point_events_no_truncate" BEFORE TRUNCATE ON "point_events" FOR EACH STATEMENT EXECUTE FUNCTION "point_events_append_only"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "point_events_no_truncate" ON "point_events"`);
    await queryRunner.query(`DROP TRIGGER "point_events_append_only" ON "point_events"`);
    await queryRunner.query(`DROP FUNCTION "point_events_append_only"()`);
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT "FK_f1221d9b1aaa64b1f3c98ed46d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_events" DROP CONSTRAINT "FK_6b9397ef6fe37cc78b47f03b924"`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_events" DROP CONSTRAINT "FK_e8c5d388e38d5eab2767a5f6484"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_events" DROP CONSTRAINT "FK_041a95c7f7867516dfa0ed79b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_events" DROP CONSTRAINT "FK_6b7520c53f24fe26f14807e811d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" DROP CONSTRAINT "FK_bab97664e91324a28d757cf0866"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" DROP CONSTRAINT "FK_350dd97812aa0f321f212585fd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_progress" DROP CONSTRAINT "FK_3796b7939c2bb68b3355b079ca8"`,
    );
    await queryRunner.query(`DROP TABLE "user_badges"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_de5f922596a799290c5861caa7"`);
    await queryRunner.query(`DROP TABLE "point_events"`);
    await queryRunner.query(`DROP TYPE "public"."point_reason"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5308c0d6d4919607a7e7ab0920"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_activity_chapters_day"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_activity_once_per_certification"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_activity_level"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_activity_badge"`);
    await queryRunner.query(`DROP TABLE "activity_events"`);
    await queryRunner.query(`DROP TYPE "public"."badge_key"`);
    await queryRunner.query(`DROP TYPE "public"."activity_kind"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_44395bed795a1620ced493cc49"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bab97664e91324a28d757cf086"`);
    await queryRunner.query(`DROP TABLE "chapter_progress"`);
  }
}
