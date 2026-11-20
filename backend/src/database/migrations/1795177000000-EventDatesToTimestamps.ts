import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventDatesToTimestamps1795177000000
  implements MigrationInterface
{
  name = 'EventDatesToTimestamps1795177000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      ALTER COLUMN "start_date" TYPE TIMESTAMP WITH TIME ZONE
      USING ("start_date"::timestamp AT TIME ZONE 'UTC')
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ALTER COLUMN "end_date" TYPE TIMESTAMP WITH TIME ZONE
      USING ("end_date"::timestamp AT TIME ZONE 'UTC')
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD CONSTRAINT "CHK_events_end_date_after_start_date"
      CHECK ("end_date" >= "start_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      DROP CONSTRAINT "CHK_events_end_date_after_start_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ALTER COLUMN "start_date" TYPE date
      USING (("start_date" AT TIME ZONE 'UTC')::date)
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ALTER COLUMN "end_date" TYPE date
      USING (("end_date" AT TIME ZONE 'UTC')::date)
    `);
  }
}
