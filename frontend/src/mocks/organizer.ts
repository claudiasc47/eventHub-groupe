import { http, HttpResponse } from 'msw/http'
import type { Event, User } from '../api/types'

export const demoOrganizer: User = {
  id: '17de1089-12ef-46d3-89ab-916db978cbb5',
  email: 'organizer@example.test',
  pseudo: 'organisateur-demo',
  firstName: null, lastName: null, phone: null, birthDate: null,
  role: 'organizer',
}

export const demoOrganizerEvents: Event[] = [
  {
    id: 'e1be1089-12ef-46d3-89ab-916db978cbb5',
    name: 'Rencontres créatives', description: 'Une soirée pour partager vos idées et rencontrer des passionnés.',
    startDate: '2026-12-15T18:00:00Z', endDate: '2026-12-15T21:00:00Z',
    location: { id: 'c1be1089-12ef-46d3-89ab-916db978cbb5', name: 'La Maison des événements, Paris' },
    category: { id: 'd1be1089-12ef-46d3-89ab-916db978cbb5', name: 'Rencontres' },
    status: 'PUBLISHED', capacity: 80, remainingSeats: 32, organizerId: demoOrganizer.id,
  },
  {
    id: 'e2be1089-12ef-46d3-89ab-916db978cbb5',
    name: 'Atelier photographie', description: null,
    startDate: '2026-12-20T13:00:00Z', endDate: '2026-12-20T16:00:00Z',
    location: { id: 'c2be1089-12ef-46d3-89ab-916db978cbb5', name: 'Le Studio, Lyon' },
    category: { id: 'd2be1089-12ef-46d3-89ab-916db978cbb5', name: 'Ateliers' },
    status: 'DRAFT', capacity: 20, remainingSeats: 20, organizerId: demoOrganizer.id,
  },
]

export function createOrganizerHandlers(baseURL: string, initial: Event[] = demoOrganizerEvents, user: User = demoOrganizer) {
  const base = baseURL.replace(/\/$/, '')
  const authorized = (request: Request) => /^Bearer .+$/i.test(request.headers.get('Authorization') ?? '')
  const unauthenticated = () => HttpResponse.json({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Session invalide ou absente.' }, { status: 401 })
  return [
    http.get(`${base}/users/me`, ({ request }) => authorized(request) ? HttpResponse.json(user) : unauthenticated()),
    http.get(`${base}/me/events`, ({ request }) => {
      if (!authorized(request)) return unauthenticated()
      if (user.role !== 'organizer') return HttpResponse.json({ statusCode: 403, code: 'FORBIDDEN', message: 'Accès réservé aux organisateurs.' }, { status: 403 })
      return HttpResponse.json(structuredClone(initial).filter((event) => event.organizerId === user.id))
    }),
  ]
}
