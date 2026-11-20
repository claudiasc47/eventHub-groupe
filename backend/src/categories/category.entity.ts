import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('categories')
@Unique('UQ_categories_name', ['name'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;
}
