import type { Event, EventInput } from '../api/types'

// Logique partagée par les formulaires de création et de modification d'un événement.

export const EVENT_FIELDS = [
  'name',
  'description',
  'startDate',
  'endDate',
  'locationId',
  'categoryId',
  'capacity',
] as const

export type EventField = (typeof EVENT_FIELDS)[number]

/** Valeurs saisies, telles que les champs du formulaire les donnent (texte). */
export type EventFormValues = Record<EventField, string>

/** Messages d'erreur par champ. L'API peut aussi en renvoyer pour d'autres champs. */
export type EventFormErrors = Partial<Record<string, string>>

export const EMPTY_EVENT_FORM: EventFormValues = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  locationId: '',
  categoryId: '',
  capacity: '',
}

export function isEventField(name: string): name is EventField {
  return (EVENT_FIELDS as readonly string[]).includes(name)
}

/** Préremplit le formulaire avec un événement existant, dates affichées dans le fuseau local. */
export function toEventFormValues(event: Event): EventFormValues {
  return {
    name: event.name,
    description: event.description ?? '',
    startDate: toLocalInput(event.startDate),
    endDate: toLocalInput(event.endDate),
    locationId: event.location.id,
    categoryId: event.category.id,
    capacity: String(event.capacity),
  }
}

export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {}
  const start = new Date(values.startDate)
  const end = new Date(values.endDate)
  if (!values.name.trim()) errors.name = 'Le nom est obligatoire.'
  if (!values.startDate || !isValidDate(start)) {
    errors.startDate = 'Renseignez une date de début valide.'
  }
  if (!values.endDate || !isValidDate(end)) {
    errors.endDate = 'Renseignez une date de fin valide.'
  } else if (end < start) {
    errors.endDate = 'La fin doit être postérieure ou égale au début.'
  }
  if (!values.locationId) errors.locationId = 'Choisissez un lieu.'
  if (!values.categoryId) errors.categoryId = 'Choisissez une catégorie.'
  const capacity = Number(values.capacity)
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    errors.capacity = 'La capacité doit être un entier positif.'
  }
  return errors
}

/** Corps attendu par le contrat : textes nettoyés, dates en ISO 8601 UTC, capacité numérique. */
export function toEventInput(values: EventFormValues): EventInput {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    ...(description && { description }),
    startDate: toUtcIso(values.startDate),
    endDate: toUtcIso(values.endDate),
    locationId: values.locationId,
    categoryId: values.categoryId,
    capacity: Number(values.capacity),
  }
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

// `datetime-local` donne une heure locale sans fuseau ; le contrat attend de l'ISO 8601 en UTC.
function toUtcIso(local: string): string {
  const date = new Date(local)
  return isValidDate(date) ? date.toISOString() : local
}

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (part: number) => String(part).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
