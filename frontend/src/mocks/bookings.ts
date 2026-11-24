import { http, HttpResponse } from 'msw/http'
import type { ApiError, Booking, BookingInput } from '../api/types'
import { demoOrganizerEvents } from './organizer'
import { createEventStore, type EventStore } from './store'

export const demoBookings: Booking[] = [
  {
    id: 'a1be1089-12ef-46d3-89ab-916db978cbb5',
    event: {
      id: 'b1be1089-12ef-46d3-89ab-916db978cbb5',
      name: 'Rencontres créatives',
      startDate: '2026-12-15T18:00:00Z',
      endDate: '2026-12-15T21:00:00Z',
      location: {
        id: 'c1be1089-12ef-46d3-89ab-916db978cbb5',
        name: 'La Maison des événements, Paris',
      },
      status: 'PUBLISHED',
    },
    quantity: 2,
    status: 'CONFIRMED',
    createdAt: '2026-11-23T08:00:00Z',
  },
  {
    id: 'a2be1089-12ef-46d3-89ab-916db978cbb5',
    event: {
      id: 'b2be1089-12ef-46d3-89ab-916db978cbb5',
      name: 'Atelier photographie',
      startDate: '2026-12-20T13:00:00Z',
      endDate: '2026-12-20T16:00:00Z',
      location: { id: 'c2be1089-12ef-46d3-89ab-916db978cbb5', name: 'Le Studio, Lyon' },
      status: 'PUBLISHED',
    },
    quantity: 1,
    status: 'CANCELLED',
    createdAt: '2026-11-20T10:00:00Z',
  },
]

export function createBookingHandlers(
  baseURL: string,
  initial: Booking[] = demoBookings,
  store: EventStore = createEventStore(demoOrganizerEvents),
) {
  const base = baseURL.replace(/\/$/, '')
  const accounts = new Map<string, Booking[]>()
  function userBookings(request: Request) {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) return null
    if (!accounts.has(token)) accounts.set(token, structuredClone(initial))
    return accounts.get(token)!
  }
  function error(statusCode: number, code: ApiError['code'], message: string) {
    return HttpResponse.json<ApiError>({ statusCode, code, message }, { status: statusCode })
  }
  const unauthenticated = () => error(401, 'UNAUTHENTICATED', 'Session invalide ou absente.')

  return [
    http.post(`${base}/events/:id/bookings`, async ({ request, params }) => {
      const bookings = userBookings(request)
      if (!bookings) return unauthenticated()

      const input = (await request.json().catch(() => null)) as Partial<BookingInput> | null
      const quantity = input?.quantity
      if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) {
        return HttpResponse.json<ApiError>(
          {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'La quantité doit être un entier positif.',
            details: [{ field: 'quantity', message: 'Saisissez un nombre entier de places.' }],
          },
          { status: 400 },
        )
      }

      const event = store.eventsFor(request).find((item) => item.id === params.id)
      if (!event || event.status !== 'PUBLISHED') {
        return error(404, 'NOT_FOUND', 'Événement introuvable.')
      }
      if (quantity > event.remainingSeats) {
        return error(409, 'INSUFFICIENT_SEATS', 'Il ne reste pas assez de places.')
      }

      const { id, name, startDate, endDate, location, status } = event
      const booking: Booking = {
        id: crypto.randomUUID(),
        event: { id, name, startDate, endDate, location, status },
        quantity,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      }
      event.remainingSeats -= quantity
      bookings.push(booking)
      return HttpResponse.json(booking, { status: 201 })
    }),
    http.get(`${base}/me/bookings`, ({ request }) => {
      const bookings = userBookings(request)
      return bookings ? HttpResponse.json(bookings) : unauthenticated()
    }),
    http.patch(`${base}/bookings/:id/cancel`, ({ request, params }) => {
      const bookings = userBookings(request)
      if (!bookings) return unauthenticated()
      const booking = bookings.find((item) => item.id === params.id)
      if (!booking) return error(404, 'NOT_FOUND', 'Réservation introuvable.')
      if (booking.status === 'CONFIRMED') {
        booking.status = 'CANCELLED'
        const event = store.eventsFor(request).find((item) => item.id === booking.event.id)
        if (event) event.remainingSeats += booking.quantity
      }
      return HttpResponse.json(booking)
    }),
  ]
}
