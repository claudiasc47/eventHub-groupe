import { Controller, Logger } from '@nestjs/common'
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices'
import { BookingsService } from '../bookings/bookings.service'
import { TicketTypesService } from '../ticket-types/ticket-types.service'
import { ExternalEvents } from './rabbitmq.service'
import { BookingStatus } from '../entity/booking.entity'

/**
 * Contrôleur qui écoute les événements RabbitMQ provenant des autres services
 */
@Controller()
export class RabbitmqController {
  private readonly logger = new Logger(RabbitmqController.name)

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly ticketTypesService: TicketTypesService,
  ) {}

  /**
   * Acknowledge le message RabbitMQ
   */
  private ack(context: RmqContext) {
    const channel = context.getChannelRef()
    const originalMsg = context.getMessage()
    channel.ack(originalMsg)
  }

  // ============================================
  // ÉVÉNEMENTS DU PAYMENT-SERVICE
  // ============================================

  /**
   * Paiement réussi → Confirmer la réservation
   */
  @EventPattern(ExternalEvents.PAYMENT_PROCESSED)
  async handlePaymentProcessed(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`📥 Received ${ExternalEvents.PAYMENT_PROCESSED}: ${JSON.stringify(data)}`)

    try {
      const { bookingId, paymentId } = data

      if (!bookingId) {
        this.logger.warn('PaymentProcessedEvent missing bookingId')
        this.ack(context)
        return
      }

      // Récupérer et confirmer la réservation
      const booking = await this.bookingsService.findOne(bookingId)
      
      if (booking.status === BookingStatus.PENDING) {
        await this.bookingsService.confirmBooking(bookingId, paymentId)
        this.logger.log(`✅ Booking ${bookingId} confirmed after payment`)
      } else {
        this.logger.warn(`Booking ${bookingId} is not in PENDING status (current: ${booking.status})`)
      }

      this.ack(context)
    } catch (error) {
      this.logger.error(`❌ Failed to handle PaymentProcessedEvent: ${error.message}`)
      this.ack(context) // Ack quand même pour éviter les boucles infinies
    }
  }

  /**
   * Paiement échoué → Annuler la réservation
   */
  @EventPattern(ExternalEvents.PAYMENT_FAILED)
  async handlePaymentFailed(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`📥 Received ${ExternalEvents.PAYMENT_FAILED}: ${JSON.stringify(data)}`)

    try {
      const { bookingId, reason } = data

      if (!bookingId) {
        this.logger.warn('PaymentFailedEvent missing bookingId')
        this.ack(context)
        return
      }

      // Annuler la réservation
      await this.bookingsService.cancelBooking(bookingId)
      this.logger.log(`❌ Booking ${bookingId} cancelled due to payment failure: ${reason}`)

      this.ack(context)
    } catch (error) {
      this.logger.error(`❌ Failed to handle PaymentFailedEvent: ${error.message}`)
      this.ack(context)
    }
  }

  // ============================================
  // ÉVÉNEMENTS DU EVENTS-SERVICE
  // ============================================

  /**
   * Événement mis à jour → Peut nécessiter des notifications
   */
  @EventPattern(ExternalEvents.EVENT_UPDATED)
  async handleEventUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`📥 Received ${ExternalEvents.EVENT_UPDATED}: ${JSON.stringify(data)}`)

    try {
      const { eventId, changes } = data
      
      // Log pour suivi - les notifications seront gérées par le notifications-service
      this.logger.log(`Event ${eventId} updated. Changes: ${JSON.stringify(changes)}`)
      
      // Si la date a changé, on pourrait vouloir notifier les utilisateurs
      // Cela sera fait via le notifications-service qui écoute aussi cet événement

      this.ack(context)
    } catch (error) {
      this.logger.error(`❌ Failed to handle EventUpdatedEvent: ${error.message}`)
      this.ack(context)
    }
  }

  /**
   * Événement annulé → Annuler toutes les réservations
   */
  @EventPattern(ExternalEvents.EVENT_CANCELLED)
  async handleEventCancelled(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`📥 Received ${ExternalEvents.EVENT_CANCELLED}: ${JSON.stringify(data)}`)

    try {
      const { eventId, reason } = data

      if (!eventId) {
        this.logger.warn('EventCancelledEvent missing eventId')
        this.ack(context)
        return
      }

      // Récupérer tous les types de billets de cet événement
      const ticketTypes = await this.ticketTypesService.findByEventId(eventId)

      // Annuler toutes les réservations pour chaque type de billet
      for (const ticketType of ticketTypes) {
        const bookings = await this.bookingsService.findAll({ ticketTypeId: ticketType.id })
        
        for (const booking of bookings) {
          if (booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.USED) {
            try {
              await this.bookingsService.cancelBooking(booking.id)
              this.logger.log(`Booking ${booking.id} cancelled due to event cancellation`)
            } catch (error) {
              this.logger.error(`Failed to cancel booking ${booking.id}: ${error.message}`)
            }
          }
        }
      }

      this.logger.log(`✅ All bookings for event ${eventId} have been cancelled. Reason: ${reason}`)

      this.ack(context)
    } catch (error) {
      this.logger.error(`❌ Failed to handle EventCancelledEvent: ${error.message}`)
      this.ack(context)
    }
  }
}
