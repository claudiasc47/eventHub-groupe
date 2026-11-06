import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Category } from './category.entity'
import { Location } from './location.entity'

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  nom: string

  @Column({ nullable: true })
  description: string

  @Column({ type: 'date' })
  date_debut: Date

  @Column({ type: 'date' })
  date_fin: Date

  // relation vers Location (plus de string)
  @ManyToOne(() => Location, (location) => location.events, { eager: true })
  @JoinColumn({ name: 'location_id' })
  location: Location

  // relation vers Category (plus de string)
  @ManyToOne(() => Category, (category) => category.events, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
