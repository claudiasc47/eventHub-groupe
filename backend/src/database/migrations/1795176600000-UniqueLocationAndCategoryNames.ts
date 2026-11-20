import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueLocationAndCategoryNames1795176600000
  implements MigrationInterface
{
  name = 'UniqueLocationAndCategoryNames1795176600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD CONSTRAINT "UQ_locations_name" UNIQUE ("name")
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "UQ_categories_name" UNIQUE ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP CONSTRAINT "UQ_categories_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "locations"
      DROP CONSTRAINT "UQ_locations_name"
    `);
  }
}
