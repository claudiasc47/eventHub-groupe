import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm'
import { Booking } from './booking.entity'

export enum TicketTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD_OUT = 'SOLD_OUT',
}

@Entity()
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  eventId: string // Référence vers l'événement (microservice events-service)

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number

  @Column({ type: 'int' })
  totalCapacity: number

  @Column({ type: 'int', default: 0 })
  soldCount: number

  @Column({ type: 'enum', enum: TicketTypeStatus, default: TicketTypeStatus.ACTIVE })
  status: TicketTypeStatus

  @OneToMany(() => Booking, (booking) => booking.ticketType)
  bookings: Booking[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Méthode helper pour vérifier la disponibilité
  get availableTickets(): number {
    return this.totalCapacity - this.soldCount
  }

  get isSoldOut(): boolean {
    return this.soldCount >= this.totalCapacity
  }
}
