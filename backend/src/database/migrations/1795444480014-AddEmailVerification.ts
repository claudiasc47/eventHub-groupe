import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1795444480014 implements MigrationInterface {
    name = 'AddEmailVerification1795444480014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_location_id"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_category_id"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_organizer_id"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_event_id"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_user_id"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "CHK_events_end_date_after_start_date"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_token_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "verification_token_expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_fccf31c64ec14a66276e9999730" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_643188b30e049632f80367be4e1" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_14c9ce53a2c2a1c781b8390123e" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_976c0fe23c870f914acd2378e4e" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE "users" SET "email_verified_at" = now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_64cd97487c5c42806458ab5520c"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_976c0fe23c870f914acd2378e4e"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_14c9ce53a2c2a1c781b8390123e"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_643188b30e049632f80367be4e1"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_fccf31c64ec14a66276e9999730"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token_hash"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "CHK_events_end_date_after_start_date" CHECK ((end_date >= start_date))`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_event_id" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_organizer_id" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_location_id" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
