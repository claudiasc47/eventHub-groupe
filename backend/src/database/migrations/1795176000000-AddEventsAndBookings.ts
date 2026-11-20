import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventsAndBookings1795176000000
  implements MigrationInterface
{
  name = 'AddEventsAndBookings1795176000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "location_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "organizer_id" uuid NOT NULL,
        "status" character varying NOT NULL,
        "capacity" integer NOT NULL,
        "remaining_seats" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_location_id" FOREIGN KEY ("location_id")
          REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_events_category_id" FOREIGN KEY ("category_id")
          REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_events_organizer_id" FOREIGN KEY ("organizer_id")
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "status" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_event_id" FOREIGN KEY ("event_id")
          REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_bookings_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "locations"`);
  }
}
