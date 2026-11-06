import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { TicketType } from './ticket-type.entity'

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

@Entity()
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string // Référence vers l'utilisateur (microservice users-service)

  @ManyToOne(() => TicketType, (ticketType) => ticketType.bookings, { eager: true })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketType

  @Column({ type: 'int' })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus

  @Column({ unique: true })
  bookingReference: string // Code unique pour la réservation

  @Column({ type: 'text', nullable: true })
  qrCode: string // QR Code encodé en base64

  @Column({ nullable: true })
  paymentId: string // Référence vers le paiement (microservice payment-service)

  @Column({ type: 'text', nullable: true })
  notes: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date
}
