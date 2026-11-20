import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('locations')
@Unique('UQ_locations_name', ['name'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;
}
