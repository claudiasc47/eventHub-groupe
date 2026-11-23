import { http, HttpResponse } from 'msw/http'
import type { Booking } from '../api/types'

export const demoBookings: Booking[] = [
  {
    id: 'a1be1089-12ef-46d3-89ab-916db978cbb5',
    event: {
      id: 'b1be1089-12ef-46d3-89ab-916db978cbb5',
      name: 'Rencontres créatives',
      startDate: '2026-12-15T18:00:00Z',
      endDate: '2026-12-15T21:00:00Z',
      location: { id: 'c1be1089-12ef-46d3-89ab-916db978cbb5', name: 'La Maison des événements, Paris' },
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

export function createBookingHandlers(baseURL: string, initial: Booking[] = demoBookings) {
  const base = baseURL.replace(/\/$/, '')
  const accounts = new Map<string, Booking[]>()
  function userBookings(request: Request) {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) return null
    if (!accounts.has(token)) accounts.set(token, structuredClone(initial))
    return accounts.get(token)!
  }
  return [
    http.get(`${base}/me/bookings`, ({ request }) => {
      const bookings = userBookings(request)
      return bookings ? HttpResponse.json(bookings) : HttpResponse.json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Session invalide ou absente.' }, { status: 401 })
    }),
    http.patch(`${base}/bookings/:id/cancel`, ({ request, params }) => {
      const bookings = userBookings(request)
      if (!bookings) return HttpResponse.json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Session invalide ou absente.' }, { status: 401 })
      const booking = bookings.find((item) => item.id === params.id)
      if (!booking) return HttpResponse.json({ statusCode: 404, code: 'NOT_FOUND', message: 'Réservation introuvable.' }, { status: 404 })
      booking.status = 'CANCELLED'
      return HttpResponse.json(booking)
    }),
  ]
}
