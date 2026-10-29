import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuth1793201530558 implements MigrationInterface {
  name = 'AddAuth1793201530558';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."email_token_type" AS ENUM('verify_email', 'reset_password')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" "public"."email_token_type" NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8acb431edfc9f9d0e77741468ed" UNIQUE ("token_hash"), CONSTRAINT "PK_08abb3fa348e894c274a6730d35" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f10e94006e04afeba4e0e8839" ON "email_tokens"  ("user_id", "type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "login_attempts" ("email" character varying(254) NOT NULL, "failed_count" smallint NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "last_failed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_0aedff58b23995504f9dc99f75d" PRIMARY KEY ("email"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "family_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "remember" boolean NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "user_agent" character varying(255), "ip" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884" UNIQUE ("token_hash"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_085d540d9f418cfbdc7bd55bb1" ON "sessions"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f61929073858aa9cb9cb893b66" ON "sessions"  ("family_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_hash" character varying(255) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_visible" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "visibility_consented_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_tokens" ADD CONSTRAINT "FK_018295f41628791c301bfe8b625" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_tokens" DROP CONSTRAINT "FK_018295f41628791c301bfe8b625"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "visibility_consented_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_visible"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f61929073858aa9cb9cb893b66"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_085d540d9f418cfbdc7bd55bb1"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "login_attempts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7f10e94006e04afeba4e0e8839"`);
    await queryRunner.query(`DROP TABLE "email_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."email_token_type"`);
  }
}
