import { http, HttpResponse } from 'msw/http'
import type { Event, EventUpdate, User } from '../api/types'

export const demoOrganizer: User = {
  id: '5b0f3c1e-8a2d-4c6e-9f10-2d3e4f5a6b7c',
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
  const stores = new Map<string, Event[]>()
  const locations = demoOrganizerEvents.map((event) => event.location)
  const categories = demoOrganizerEvents.map((event) => event.category)
  function eventsFor(request: Request) {
    const token = request.headers.get('Authorization') ?? ''
    if (!stores.has(token)) stores.set(token, structuredClone(initial))
    return stores.get(token)!
  }
  const forbidden = () => HttpResponse.json({ statusCode: 403, code: 'FORBIDDEN', message: 'Accès non autorisé.' }, { status: 403 })
  const missing = () => HttpResponse.json({ statusCode: 404, code: 'NOT_FOUND', message: 'Événement introuvable.' }, { status: 404 })
  return [
    http.get(`${base}/users/me`, ({ request }) => authorized(request) ? HttpResponse.json(user) : unauthenticated()),
    http.get(`${base}/me/events`, ({ request }) => {
      if (!authorized(request)) return unauthenticated()
      if (user.role !== 'organizer') return HttpResponse.json({ statusCode: 403, code: 'FORBIDDEN', message: 'Accès réservé aux organisateurs.' }, { status: 403 })
      return HttpResponse.json(eventsFor(request).filter((event) => event.organizerId === user.id))
    }),
    http.get(`${base}/locations`, () => HttpResponse.json(locations)),
    http.get(`${base}/categories`, () => HttpResponse.json(categories)),
    http.get(`${base}/events/:id`, ({ request, params }) => {
      const event = eventsFor(request).find((item) => item.id === params.id)
      if (!event || (event.status === 'DRAFT' && (!authorized(request) || event.organizerId !== user.id))) return missing()
      return HttpResponse.json(event)
    }),
    http.patch(`${base}/events/:id`, async ({ request, params }) => {
      if (!authorized(request)) return unauthenticated()
      if (user.role !== 'organizer') return forbidden()
      const event = eventsFor(request).find((item) => item.id === params.id)
      if (!event) return missing()
      if (event.organizerId !== user.id) return forbidden()
      const input = await request.json() as EventUpdate & { status?: string }
      const invalid = (field: string, message: string) => HttpResponse.json({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Certaines données sont invalides.', details: [{ field, message }] }, { status: 400 })
      if (Object.keys(input).some((key) => !['name', 'description', 'startDate', 'endDate', 'locationId', 'categoryId', 'capacity', 'status'].includes(key))) return invalid('body', 'Champ non autorisé.')
      if (input.status !== undefined && input.status !== 'PUBLISHED') return invalid('status', 'Le retour en brouillon est interdit.')
      if (input.name !== undefined && !input.name.trim()) return invalid('name', 'Le nom est obligatoire.')
      const start = input.startDate ?? event.startDate
      const end = input.endDate ?? event.endDate
      if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) < Date.parse(start)) return invalid('endDate', 'La fin doit être postérieure ou égale au début.')
      const capacity = input.capacity ?? event.capacity
      if (!Number.isSafeInteger(capacity) || capacity < 1) return invalid('capacity', 'La capacité doit être un entier positif.')
      const reserved = event.capacity - event.remainingSeats
      if (capacity < reserved) return HttpResponse.json({ statusCode: 409, code: 'CAPACITY_BELOW_RESERVED', message: 'La capacité est inférieure aux places réservées.' }, { status: 409 })
      const location = input.locationId ? locations.find((item) => item.id === input.locationId) : event.location
      const category = input.categoryId ? categories.find((item) => item.id === input.categoryId) : event.category
      if (!location) return invalid('locationId', 'Lieu introuvable.')
      if (!category) return invalid('categoryId', 'Catégorie introuvable.')
      Object.assign(event, {
        name: input.name?.trim() ?? event.name,
        description: input.description === undefined ? event.description : input.description,
        startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(),
        capacity, remainingSeats: capacity - reserved, location, category,
        status: input.status ?? event.status,
      })
      return HttpResponse.json(event)
    }),
  ]
}
