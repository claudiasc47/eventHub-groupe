import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Event } from './event.entity'

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  libelle: string

  @OneToMany(() => Event, (event) => event.category)
  events: Event[]
}
