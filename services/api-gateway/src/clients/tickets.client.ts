import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs/internal/firstValueFrom'
import { BookEventInputDto } from 'src/common/dto/booking/book-event.input.dto'
import { BookEventOutputDto } from 'src/common/dto/booking/book-event.output.dto'

type Ticket = {
  id: string
  eventId: string
  name: string
  description: string
  price: number
  status: string
}
@Injectable()
export class TicketsClient {
  private readonly baseUrl = process.env.TICKETING_SERVICE_URL

  constructor(private readonly http: HttpService) {}

  async getAvailableTickets(eventId: string): Promise<Ticket[]> {
    const { data } = await firstValueFrom(this.http.get<Ticket[]>(`${this.baseUrl}/ticket-types`))

    const availableTickets = data.filter(
      (ticket) => ticket.eventId === eventId && ticket.status === 'ACTIVE',
    )
    return availableTickets
  }

  async bookTickets(dto: BookEventInputDto): Promise<BookEventOutputDto> {
    const { data } = await firstValueFrom(
      this.http.post<BookEventOutputDto>(`${this.baseUrl}/bookings`, dto),
    )
    return data
  }
}
