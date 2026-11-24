import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Event } from './event.entity'

@Entity()
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  nom: string

  @Column()
  adresse: string

  @Column()
  ville: string

  @Column()
  code_postal: string

  @Column()
  capacite: number

  @OneToMany(() => Event, (event) => event.location)
  events: Event[]
}
