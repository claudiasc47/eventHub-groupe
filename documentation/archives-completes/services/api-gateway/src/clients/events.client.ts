import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs/internal/firstValueFrom'

type Category = {
  id: string
  nom: string
}
type Location = {
  id: string
  nom: string
  adresse: string
  ville: string
  pays: string
}

type Event = {
  id: string
  nom: string
  description: string
  date_debut: string
  date_fin: string
  status: string
  category: Category
  location: Location
}
@Injectable()
export class EventsClient {
  private readonly baseUrl = process.env.EVENTS_SERVICE_URL

  constructor(private readonly http: HttpService) {}

  async getAll(): Promise<Event[]> {
    const { data } = await firstValueFrom(this.http.get<Event[]>(`${this.baseUrl}/events`))
    return data
  }

  async getOne(id: string): Promise<Event> {
    const { data } = await firstValueFrom(this.http.get<Event>(`${this.baseUrl}/events/${id}`))
    return data
  }

  async create(eventData: Partial<Event>): Promise<Event> {
    const { data } = await firstValueFrom(
      this.http.post<Event>(`${this.baseUrl}/events`, eventData),
    )
    return data
  }
}
