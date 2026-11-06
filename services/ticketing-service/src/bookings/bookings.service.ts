import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere } from 'typeorm'
import { Booking, BookingStatus } from '../entity/booking.entity'
import { TicketTypesService } from '../ticket-types/ticket-types.service'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { FilterBookingDto } from './dto/filter-booking.dto'
import { v4 as uuidv4 } from 'uuid'
import * as QRCode from 'qrcode'

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name)

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly ticketTypesService: TicketTypesService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    // Vérifier que le type de billet existe et a assez de places
    const ticketType = await this.ticketTypesService.findOne(dto.ticketTypeId)

    if (ticketType.availableTickets < dto.quantity) {
      throw new BadRequestException(
        `Only ${ticketType.availableTickets} tickets available for ${ticketType.name}`,
      )
    }

    // Calculer le prix total
    const totalPrice = ticketType.price * dto.quantity

    // Générer une référence unique
    const bookingReference = this.generateBookingReference()

    // Créer la réservation
    const booking = this.bookingRepository.create({
      userId: dto.userId,
      ticketType,
      quantity: dto.quantity,
      totalPrice,
      bookingReference,
      notes: dto.notes,
      status: BookingStatus.PENDING,
    })

    // Générer le QR code
    booking.qrCode = await this.generateQRCode(bookingReference)

    // Sauvegarder
    const savedBooking = await this.bookingRepository.save(booking)

    // Incrémenter le compteur de ventes
    await this.ticketTypesService.incrementSoldCount(dto.ticketTypeId, dto.quantity)

    // Émettre l'événement RabbitMQ
    this.rabbitmqService.emitTicketBooked({
      id: savedBooking.id,
      bookingReference: savedBooking.bookingReference,
      userId: savedBooking.userId,
      eventId: ticketType.eventId,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      quantity: savedBooking.quantity,
      totalPrice: savedBooking.totalPrice,
    })

    this.logger.log(`Booking created: ${savedBooking.bookingReference} - Event emitted to RabbitMQ`)

    return savedBooking
  }

  async findAll(filter: FilterBookingDto): Promise<Booking[]> {
    const where: FindOptionsWhere<Booking> = {}

    if (filter.userId) {
      where.userId = filter.userId
    }

    if (filter.status) {
      where.status = filter.status
    }

    if (filter.bookingReference) {
      where.bookingReference = filter.bookingReference
    }

    if (filter.ticketTypeId) {
      where.ticketType = { id: filter.ticketTypeId }
    }

    const bookings = await this.bookingRepository.find({
      where,
      relations: ['ticketType'],
      order: { createdAt: 'DESC' },
    })

    // Filtrer par eventId si nécessaire
    if (filter.eventId) {
      return bookings.filter((booking) => booking.ticketType.eventId === filter.eventId)
    }

    return bookings
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['ticketType'],
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    return booking
  }

  async findByReference(bookingReference: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingReference },
      relations: ['ticketType'],
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    return booking
  }

  async update(id: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id)

    // Si on change la quantité, ajuster le compteur
    if (dto.quantity && dto.quantity !== booking.quantity) {
      const difference = dto.quantity - booking.quantity

      if (difference > 0) {
        await this.ticketTypesService.incrementSoldCount(booking.ticketType.id, difference)
      } else {
        await this.ticketTypesService.decrementSoldCount(booking.ticketType.id, Math.abs(difference))
      }

      booking.totalPrice = booking.ticketType.price * dto.quantity
    }

    // Mettre à jour les timestamps selon le statut
    if (dto.status) {
      if (dto.status === BookingStatus.CONFIRMED && !booking.confirmedAt) {
        booking.confirmedAt = new Date()
      } else if (dto.status === BookingStatus.CANCELLED && !booking.cancelledAt) {
        booking.cancelledAt = new Date()
      } else if (dto.status === BookingStatus.USED && !booking.usedAt) {
        booking.usedAt = new Date()
      }
    }

    Object.assign(booking, dto)

    return this.bookingRepository.save(booking)
  }

  async confirmBooking(id: string, paymentId: string): Promise<Booking> {
    const booking = await this.update(id, {
      status: BookingStatus.CONFIRMED,
      paymentId,
    })

    // Émettre l'événement de confirmation
    this.rabbitmqService.emitTicketConfirmed({
      id: booking.id,
      bookingReference: booking.bookingReference,
      userId: booking.userId,
      eventId: booking.ticketType.eventId,
      qrCode: booking.qrCode,
    })

    this.logger.log(`Booking confirmed: ${booking.bookingReference} - Event emitted to RabbitMQ`)

    return booking
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.findOne(id)

    if (booking.status === BookingStatus.USED) {
      throw new BadRequestException('Cannot cancel a used booking')
    }

    // Décrémenter le compteur de ventes
    await this.ticketTypesService.decrementSoldCount(booking.ticketType.id, booking.quantity)

    const cancelledBooking = await this.update(id, {
      status: BookingStatus.CANCELLED,
    })

    // Émettre l'événement d'annulation
    this.rabbitmqService.emitTicketCancelled({
      id: cancelledBooking.id,
      userId: cancelledBooking.userId,
      eventId: cancelledBooking.ticketType.eventId,
      ticketTypeId: cancelledBooking.ticketType.id,
      quantity: cancelledBooking.quantity,
      totalPrice: cancelledBooking.totalPrice,
      wasConfirmed: booking.status === BookingStatus.CONFIRMED,
    })

    this.logger.log(`Booking cancelled: ${cancelledBooking.bookingReference} - Event emitted to RabbitMQ`)

    return cancelledBooking
  }

  async validateBooking(bookingReference: string): Promise<Booking> {
    const booking = await this.findByReference(bookingReference)

    if (booking.status === BookingStatus.USED) {
      throw new BadRequestException('Booking already used')
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking is not confirmed')
    }

    const validatedBooking = await this.update(booking.id, {
      status: BookingStatus.USED,
    })

    // Émettre l'événement de validation
    this.rabbitmqService.emitTicketValidated({
      id: validatedBooking.id,
      bookingReference: validatedBooking.bookingReference,
      userId: validatedBooking.userId,
      eventId: validatedBooking.ticketType.eventId,
    })

    this.logger.log(`Booking validated: ${validatedBooking.bookingReference} - Event emitted to RabbitMQ`)

    return validatedBooking
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id)

    if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.USED) {
      throw new BadRequestException('Cannot delete confirmed or used booking. Cancel it instead.')
    }

    await this.bookingRepository.remove(booking)
  }

  async getQRCode(id: string): Promise<string> {
    const booking = await this.findOne(id)
    return booking.qrCode
  }

  private generateBookingReference(): string {
    return `BK-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`
  }

  private async generateQRCode(bookingReference: string): Promise<string> {
    try {
      const qrCodeData = await QRCode.toDataURL(bookingReference, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
      })
      return qrCodeData
    } catch (error) {
      throw new BadRequestException('Failed to generate QR code')
    }
  }
}
