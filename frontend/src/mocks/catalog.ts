import { http, HttpResponse } from 'msw/http'
import type { ApiError, Event, EventPage } from '../api/types'
import { demoCategories, demoLocations } from './events'
import { demoOrganizerEvents } from './organizer'
import { createEventStore, type EventStore } from './store'

const otherOrganizerId = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'

// Dates relatives pour que la démo reste « à venir ».
function inDays(days: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function catalogEvent(
  id: string,
  name: string,
  description: string | null,
  days: number,
  [location, category]: [number, number],
  seats: { capacity: number; remaining: number },
): Event {
  return {
    id,
    name,
    description,
    startDate: inDays(days, 19),
    endDate: inDays(days, 22),
    location: demoLocations[location],
    category: demoCategories[category],
    status: 'PUBLISHED',
    capacity: seats.capacity,
    remainingSeats: seats.remaining,
    organizerId: otherOrganizerId,
  }
}

export const demoCatalogEvents: Event[] = [
  catalogEvent(
    'a1c0ffee-0000-4000-8000-000000000001',
    'Soirée jazz au Studio',
    'Trio jazz et jam session ouverte aux musiciens amateurs.',
    3,
    [1, 0],
    { capacity: 60, remaining: 12 },
  ),
  catalogEvent(
    'a1c0ffee-0000-4000-8000-000000000002',
    'Atelier aquarelle',
    'Initiation à l’aquarelle, matériel fourni.',
    6,
    [1, 1],
    { capacity: 15, remaining: 0 },
  ),
  catalogEvent(
    'a1c0ffee-0000-4000-8000-000000000003',
    'Rencontre entrepreneurs',
    null,
    10,
    [0, 0],
    { capacity: 120, remaining: 87 },
  ),
  catalogEvent(
    'a1c0ffee-0000-4000-8000-000000000004',
    'Atelier photo de rue',
    'Balade photo dans le quartier, tous niveaux.',
    21,
    [0, 1],
    { capacity: 12, remaining: 5 },
  ),
]

export const demoEvents: Event[] = [...demoOrganizerEvents, ...demoCatalogEvents]

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function invalid(field: string, message: string) {
  return HttpResponse.json(
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Certains filtres sont invalides.',
      details: [{ field, message }],
    } satisfies ApiError,
    { status: 400 },
  )
}

function dayStart(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`)
}

export function createCatalogHandlers(
  baseURL: string,
  store: EventStore = createEventStore(demoEvents),
) {
  const base = baseURL.replace(/\/$/, '')

  return [
    http.get(`${base}/events`, ({ request }) => {
      const params = new URL(request.url).searchParams
      const q = params.get('q')?.trim().toLowerCase() ?? ''
      const categoryId = params.get('categoryId')
      const locationId = params.get('locationId')
      const dateFrom = params.get('dateFrom')
      const dateTo = params.get('dateTo')
      const sort = params.get('sort') ?? 'startDate:asc'
      const page = Number(params.get('page') ?? 1)
      const pageSize = Number(params.get('pageSize') ?? 20)

      if (dateFrom && !DATE_ONLY.test(dateFrom)) return invalid('dateFrom', 'Date invalide.')
      if (dateTo && !DATE_ONLY.test(dateTo)) return invalid('dateTo', 'Date invalide.')
      if (!['startDate:asc', 'startDate:desc'].includes(sort))
        return invalid('sort', 'Tri inconnu.')
      if (!Number.isInteger(page) || page < 1) return invalid('page', 'Page invalide.')
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        return invalid('pageSize', 'Taille de page invalide.')
      }

      const matching = store
        .eventsFor(request)
        .filter((event) => {
          const start = Date.parse(event.startDate)
          const text = `${event.name} ${event.description ?? ''}`.toLowerCase()
          return (
            event.status === 'PUBLISHED' &&
            (!q || text.includes(q)) &&
            (!categoryId || event.category.id === categoryId) &&
            (!locationId || event.location.id === locationId) &&
            (!dateFrom || start >= dayStart(dateFrom)) &&
            (!dateTo || start < dayStart(dateTo) + 24 * 60 * 60 * 1000)
          )
        })
        .sort((a, b) => {
          const byDate = Date.parse(a.startDate) - Date.parse(b.startDate)
          return (sort === 'startDate:desc' ? -byDate : byDate) || a.id.localeCompare(b.id)
        })

      return HttpResponse.json({
        items: matching.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: matching.length,
      } satisfies EventPage)
    }),
    // Si le mock organisateur est actif, son GET /events/:id répond en premier.
    http.get(`${base}/events/:id`, ({ request, params }) => {
      const event = store
        .eventsFor(request)
        .find((item) => item.id === params.id && item.status === 'PUBLISHED')
      if (event) return HttpResponse.json(event)
      return HttpResponse.json(
        {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Événement introuvable.',
        } satisfies ApiError,
        { status: 404 },
      )
    }),
  ]
}
