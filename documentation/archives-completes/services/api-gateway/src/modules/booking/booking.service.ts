import { Injectable } from '@nestjs/common'
import { EventsClient } from 'src/clients/events.client'
import { TicketsClient } from 'src/clients/tickets.client'
import { BookEventInputDto } from 'src/common/dto/booking/book-event.input.dto'

@Injectable()
export class BookingService {
  constructor(
    private readonly eventsClient: EventsClient,
    private readonly ticketsClient: TicketsClient,
  ) {}

  async getAvailableEvents() {
    const availableEvents = (await this.eventsClient.getAll()).filter(
      (event) => event.status === 'PUBLISHED',
    )
    return availableEvents
  }

  async getEventById(id: string) {
    return this.eventsClient.getOne(id)
  }

  async bookAvailableEvent(eventId: string, dto: BookEventInputDto) {
    const event = await this.eventsClient.getOne(eventId)
    if (!event || event.status !== 'PUBLISHED') {
      throw new Error('Event not available')
    }

    const availableTickets = await this.ticketsClient.getAvailableTickets(eventId)

    if (availableTickets.length === 0) {
      throw new Error('No available tickets for this event')
    }

    const ticket = await this.ticketsClient.bookTickets(dto)

    return ticket
  }
}
