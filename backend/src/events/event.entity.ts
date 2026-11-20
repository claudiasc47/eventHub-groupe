import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { User } from '../users/user.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @ManyToOne(() => Location, { nullable: false })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'integer' })
  capacity!: number;

  @Column({ name: 'remaining_seats', type: 'integer' })
  remainingSeats!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: true,
  })
  createdAt!: Date | null;
}
