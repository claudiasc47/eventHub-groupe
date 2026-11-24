import { http, HttpResponse } from 'msw/http'
import type { ApiError, Event, EventInput, FieldError, NamedRef } from '../api/types'
import { demoOrganizer, demoOrganizerEvents } from './organizer'
import { createEventStore, type EventStore } from './store'

// Une seule source de lieux et catégories de démo, partagée avec le mock organisateur
// (qui répond aussi à GET /locations et GET /categories) : sinon le formulaire proposerait
// des identifiants que POST /events refuserait quand les deux mocks sont actifs.
function uniqueById(items: NamedRef[]): NamedRef[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export const demoLocations = uniqueById(demoOrganizerEvents.map((event) => event.location))
export const demoCategories = uniqueById(demoOrganizerEvents.map((event) => event.category))

function error(statusCode: number, code: ApiError['code'], message: string) {
  return HttpResponse.json<ApiError>({ statusCode, code, message }, { status: statusCode })
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !isNaN(Date.parse(value))
}

function validate(input: Partial<EventInput>): FieldError[] {
  const details: FieldError[] = []
  if (!input.name?.trim()) {
    details.push({ field: 'name', message: 'Le nom est obligatoire.' })
  }
  if (!isDateTime(input.startDate)) {
    details.push({ field: 'startDate', message: 'Saisissez une date de début valide.' })
  }
  if (!isDateTime(input.endDate)) {
    details.push({ field: 'endDate', message: 'Saisissez une date de fin valide.' })
  } else if (isDateTime(input.startDate) && input.endDate < input.startDate) {
    details.push({ field: 'endDate', message: 'La fin doit être après le début.' })
  }
  if (!demoLocations.some((location) => location.id === input.locationId)) {
    details.push({ field: 'locationId', message: 'Choisissez un lieu.' })
  }
  if (!demoCategories.some((category) => category.id === input.categoryId)) {
    details.push({ field: 'categoryId', message: 'Choisissez une catégorie.' })
  }
  if (!Number.isInteger(input.capacity) || (input.capacity ?? 0) < 1) {
    details.push({ field: 'capacity', message: 'La capacité doit être un entier positif.' })
  }
  return details
}

// Simule les routes du contrat v0.1 utilisées par la création d'événement.
// Limite : le mock vérifie la présence d'un jeton, pas le rôle de son propriétaire.
export function createEventHandlers(
  baseURL: string,
  store: EventStore = createEventStore(demoOrganizerEvents),
) {
  const base = baseURL.replace(/\/$/, '')

  return [
    http.get(`${base}/locations`, () => HttpResponse.json(demoLocations)),
    http.get(`${base}/categories`, () => HttpResponse.json(demoCategories)),
    http.post(`${base}/events`, async ({ request }) => {
      if (!/^Bearer .+/i.test(request.headers.get('Authorization') ?? '')) {
        return error(401, 'UNAUTHENTICATED', 'Session invalide ou expirée.')
      }
      const input = (await request.json()) as Partial<EventInput>
      const details = validate(input)
      if (details.length) {
        return HttpResponse.json<ApiError>(
          {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'Certaines données sont invalides.',
            details,
          },
          { status: 400 },
        )
      }

      const { name, description, startDate, endDate, locationId, categoryId, capacity } =
        input as EventInput
      const event: Event = {
        id: crypto.randomUUID(),
        name,
        description: description ?? null,
        startDate,
        endDate,
        location: demoLocations.find((location) => location.id === locationId)!,
        category: demoCategories.find((category) => category.id === categoryId)!,
        status: 'DRAFT',
        capacity,
        remainingSeats: capacity,
        organizerId: demoOrganizer.id,
      }
      store.eventsFor(request).push(event)
      return HttpResponse.json(event, { status: 201 })
    }),
  ]
}
