import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793156406998 implements MigrationInterface {
  name = 'Init1793156406998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chapters" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "certification_id" uuid NOT NULL, "domain_id" uuid NOT NULL, "order" smallint NOT NULL, "title" character varying(200) NOT NULL, "estimated_minutes" smallint NOT NULL, CONSTRAINT "UQ_d7269e79cd801a5f0aa7636704b" UNIQUE ("certification_id", "order"), CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b12fe733a2c89c4cb136c83da" ON "chapters"  ("domain_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "providers" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(16) NOT NULL, "name" character varying(80) NOT NULL, "hue" smallint NOT NULL, CONSTRAINT "UQ_cdc1db37b0ed3c1c6bc8c1f0458" UNIQUE ("code"), CONSTRAINT "PK_af13fc2ebf382fe0dad2e4793aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "specialties" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(16) NOT NULL, "name" character varying(120) NOT NULL, "hue" smallint NOT NULL, CONSTRAINT "UQ_0ecc16d70a3eba636ba693759da" UNIQUE ("code"), CONSTRAINT "PK_ba01cec5aa8ac48778a1d097e98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."certification_level" AS ENUM('foundational', 'associate', 'professional', 'expert')`,
    );
    await queryRunner.query(
      `CREATE TABLE "certifications" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(24) NOT NULL, "slug" character varying(64) NOT NULL, "name" character varying(160) NOT NULL, "exam_code" character varying(64), "level" "public"."certification_level" NOT NULL, "difficulty" smallint NOT NULL, "for_all_specialties" boolean NOT NULL DEFAULT false, "badge_asset" character varying(160), "is_active" boolean NOT NULL DEFAULT true, "provider_id" uuid NOT NULL, CONSTRAINT "UQ_9e80a8a69b50152c52dfd89c3ab" UNIQUE ("code"), CONSTRAINT "UQ_df1a8f70676d03f15e1c85000e6" UNIQUE ("slug"), CONSTRAINT "certification_difficulty_range" CHECK ("difficulty" BETWEEN 1 AND 5), CONSTRAINT "PK_fd763d412e4a1fb1b6dadd6e72b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0aa5f9ae56ea8fdef617be9aeb" ON "certifications"  ("level") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa2f25aec179ed220c7409df62" ON "certifications"  ("provider_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "certification_domains" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "certification_id" uuid NOT NULL, "order" smallint NOT NULL, "title" character varying(160) NOT NULL, "short_title" character varying(40) NOT NULL, "weight_pct" smallint, CONSTRAINT "UQ_76390fa6f2f9d54c1d063804419" UNIQUE ("certification_id", "order"), CONSTRAINT "PK_5540f4156881e6c0923fd71ad79" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."path_kind" AS ENUM('shared', 'specialty')`);
    await queryRunner.query(
      `CREATE TABLE "paths" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(16) NOT NULL, "name" character varying(120) NOT NULL, "kind" "public"."path_kind" NOT NULL, "specialty_id" uuid, CONSTRAINT "UQ_3a30199f633ebf28e3711cf8a37" UNIQUE ("code"), CONSTRAINT "UQ_ba1a8ad5ad8527002762198807c" UNIQUE ("specialty_id"), CONSTRAINT "PK_3023c8d7a50ae9c50117a94e502" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "path_nodes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "path_id" uuid NOT NULL, "certification_id" uuid NOT NULL, "col" smallint NOT NULL, "row" smallint NOT NULL, "prerequisite_id" uuid, CONSTRAINT "UQ_6ed2f414bb02477777795cc2098" UNIQUE ("path_id", "col", "row"), CONSTRAINT "UQ_cb91af21af0d4ec77b40caf7329" UNIQUE ("path_id", "certification_id"), CONSTRAINT "PK_cd10e0229311a2c894d11db68d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "classes" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(32) NOT NULL, "year" smallint NOT NULL, "group" character varying(8) NOT NULL, "specialty_id" uuid, CONSTRAINT "UQ_cf7491878e0fca8599438629988" UNIQUE ("code"), CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa857f9c76a54e2ed7ce574850" ON "classes"  ("year") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('student', 'staff', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(254) NOT NULL, "first_name" character varying(80) NOT NULL, "last_name" character varying(80) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'student', "class_id" uuid, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0372533220ea48efd136c33578" ON "users"  ("class_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "certification_specialties" ("certification_id" uuid NOT NULL, "specialty_id" uuid NOT NULL, CONSTRAINT "PK_fc283beabcc9df06c12af03d07d" PRIMARY KEY ("certification_id", "specialty_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4c5251ffcb19a3bbd2c18a0a8" ON "certification_specialties"  ("certification_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4ea48ece48ff92621e5e8e2910" ON "certification_specialties"  ("specialty_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_922a2333ab13fcd9f6cc5f063e7" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_9b12fe733a2c89c4cb136c83da9" FOREIGN KEY ("domain_id") REFERENCES "certification_domains"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" ADD CONSTRAINT "FK_fa2f25aec179ed220c7409df62a" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certification_domains" ADD CONSTRAINT "FK_c4dd7b2b1b5db526dcb93f37362" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "paths" ADD CONSTRAINT "FK_ba1a8ad5ad8527002762198807c" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" ADD CONSTRAINT "FK_7ca5726b2207c45d17bb2bd3641" FOREIGN KEY ("path_id") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" ADD CONSTRAINT "FK_cba7ac11a9a736e5da819443110" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" ADD CONSTRAINT "FK_4fc1d04750bbe5562c00884e930" FOREIGN KEY ("prerequisite_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "FK_57a13f7de2d7fb2e83a127751d2" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_0372533220ea48efd136c335789" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certification_specialties" ADD CONSTRAINT "FK_f4c5251ffcb19a3bbd2c18a0a81" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "certification_specialties" ADD CONSTRAINT "FK_4ea48ece48ff92621e5e8e2910e" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certification_specialties" DROP CONSTRAINT "FK_4ea48ece48ff92621e5e8e2910e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certification_specialties" DROP CONSTRAINT "FK_f4c5251ffcb19a3bbd2c18a0a81"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0372533220ea48efd136c335789"`);
    await queryRunner.query(
      `ALTER TABLE "classes" DROP CONSTRAINT "FK_57a13f7de2d7fb2e83a127751d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" DROP CONSTRAINT "FK_4fc1d04750bbe5562c00884e930"`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" DROP CONSTRAINT "FK_cba7ac11a9a736e5da819443110"`,
    );
    await queryRunner.query(
      `ALTER TABLE "path_nodes" DROP CONSTRAINT "FK_7ca5726b2207c45d17bb2bd3641"`,
    );
    await queryRunner.query(`ALTER TABLE "paths" DROP CONSTRAINT "FK_ba1a8ad5ad8527002762198807c"`);
    await queryRunner.query(
      `ALTER TABLE "certification_domains" DROP CONSTRAINT "FK_c4dd7b2b1b5db526dcb93f37362"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT "FK_fa2f25aec179ed220c7409df62a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_9b12fe733a2c89c4cb136c83da9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_922a2333ab13fcd9f6cc5f063e7"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_4ea48ece48ff92621e5e8e2910"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f4c5251ffcb19a3bbd2c18a0a8"`);
    await queryRunner.query(`DROP TABLE "certification_specialties"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0372533220ea48efd136c33578"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa857f9c76a54e2ed7ce574850"`);
    await queryRunner.query(`DROP TABLE "classes"`);
    await queryRunner.query(`DROP TABLE "path_nodes"`);
    await queryRunner.query(`DROP TABLE "paths"`);
    await queryRunner.query(`DROP TYPE "public"."path_kind"`);
    await queryRunner.query(`DROP TABLE "certification_domains"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa2f25aec179ed220c7409df62"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0aa5f9ae56ea8fdef617be9aeb"`);
    await queryRunner.query(`DROP TABLE "certifications"`);
    await queryRunner.query(`DROP TYPE "public"."certification_level"`);
    await queryRunner.query(`DROP TABLE "specialties"`);
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9b12fe733a2c89c4cb136c83da"`);
    await queryRunner.query(`DROP TABLE "chapters"`);
  }
}
