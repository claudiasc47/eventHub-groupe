import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'

/**
 * Événements émis par le ticketing-service
 * Ces événements correspondent aux routing keys définies dans RabbitMQ
 */
export enum TicketingEvents {
  // Réservation créée - en attente de paiement
  TICKET_BOOKED = 'TicketBookedEvent',
  // Réservation confirmée après paiement
  TICKET_CONFIRMED = 'TicketConfirmedEvent',
  // Réservation annulée
  TICKET_CANCELLED = 'TicketCancelledEvent',
  // Billet validé (scanné à l'entrée)
  TICKET_VALIDATED = 'TicketValidatedEvent',
  // Type de billet épuisé
  TICKET_TYPE_SOLD_OUT = 'TicketTypeSoldOutEvent',
}

/**
 * Événements reçus depuis d'autres services
 */
export enum ExternalEvents {
  // Depuis events-service
  EVENT_CREATED = 'EventCreatedEvent',
  EVENT_UPDATED = 'EventUpdatedEvent',
  EVENT_CANCELLED = 'EventCancelledEvent',
  // Depuis payment-service
  PAYMENT_PROCESSED = 'PaymentProcessedEvent',
  PAYMENT_FAILED = 'PaymentFailedEvent',
}

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name)
  private isConnected = false

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect()
      this.isConnected = true
      this.logger.log('✅ Connected to RabbitMQ')
    } catch (error) {
      this.logger.warn('⚠️ RabbitMQ not available, running in standalone mode')
      this.isConnected = false
    }
  }

  /**
   * Publie un événement sur l'exchange RabbitMQ
   */
  private async publish(routingKey: string, data: any) {
    if (!this.isConnected) {
      this.logger.warn(`Cannot publish ${routingKey}: RabbitMQ not connected`)
      return
    }

    try {
      this.client.emit(routingKey, {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'ticketing-service',
      })
      this.logger.log(`📤 Event published: ${routingKey}`)
    } catch (error) {
      this.logger.error(`Failed to publish ${routingKey}: ${error.message}`)
    }
  }

  // ============================================
  // ÉVÉNEMENTS DE RÉSERVATION
  // ============================================

  /**
   * Émet quand une réservation est créée (en attente de paiement)
   * → Déclenche le processus de paiement
   */
  async emitTicketBooked(booking: {
    id: string
    userId: string
    eventId: string
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
    totalPrice: number
    bookingReference: string
  }) {
    await this.publish(TicketingEvents.TICKET_BOOKED, {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      ticketTypeId: booking.ticketTypeId,
      ticketTypeName: booking.ticketTypeName,
      quantity: booking.quantity,
      amount: booking.totalPrice,
      currency: 'EUR',
      bookingReference: booking.bookingReference,
    })
  }

  /**
   * Émet quand une réservation est confirmée (paiement réussi)
   * → Déclenche l'envoi de notification/email
   */
  async emitTicketConfirmed(booking: {
    id: string
    userId: string
    eventId: string
    bookingReference: string
    qrCode: string
  }) {
    await this.publish(TicketingEvents.TICKET_CONFIRMED, {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      bookingReference: booking.bookingReference,
      qrCode: booking.qrCode,
    })
  }

  /**
   * Émet quand une réservation est annulée
   * → Déclenche le remboursement si paiement effectué
   */
  async emitTicketCancelled(booking: {
    id: string
    userId: string
    eventId: string
    ticketTypeId: string
    quantity: number
    totalPrice: number
    wasConfirmed: boolean
  }) {
    await this.publish(TicketingEvents.TICKET_CANCELLED, {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      ticketTypeId: booking.ticketTypeId,
      quantity: booking.quantity,
      amount: booking.totalPrice,
      requiresRefund: booking.wasConfirmed,
    })
  }

  /**
   * Émet quand un billet est validé (scanné à l'entrée)
   */
  async emitTicketValidated(booking: {
    id: string
    userId: string
    eventId: string
    bookingReference: string
  }) {
    await this.publish(TicketingEvents.TICKET_VALIDATED, {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      bookingReference: booking.bookingReference,
    })
  }

  /**
   * Émet quand un type de billet est épuisé
   */
  async emitTicketTypeSoldOut(ticketType: {
    id: string
    eventId: string
    name: string
    totalCapacity: number
  }) {
    await this.publish(TicketingEvents.TICKET_TYPE_SOLD_OUT, {
      ticketTypeId: ticketType.id,
      eventId: ticketType.eventId,
      ticketTypeName: ticketType.name,
      totalCapacity: ticketType.totalCapacity,
    })
  }
}
