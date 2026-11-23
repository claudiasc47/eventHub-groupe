import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Event, EventInput, NamedRef } from '../api/types'
import { useReferenceData } from '../api/useReferenceData'
import { clearSession } from '../auth/session'

const FIELD_NAMES = [
  'name',
  'description',
  'startDate',
  'endDate',
  'locationId',
  'categoryId',
  'capacity',
] as const

type FieldName = (typeof FIELD_NAMES)[number]
type FieldErrors = Partial<Record<string, string>>

export function EventCreatePage() {
  const reference = useReferenceData()
  const [created, setCreated] = useState<Event | null>(null)

  if (created) {
    return (
      <section className="form-page">
        <h1>Créer un événement</h1>
        <p role="status">Événement « {created.name} » créé en brouillon.</p>
        <p>Il n’apparaîtra dans le catalogue qu’après sa publication.</p>
        <p>
          <Link to={`/events/${created.id}/edit`}>Modifier ou publier l’événement</Link>
        </p>
        <button type="button" onClick={() => setCreated(null)}>
          Créer un autre événement
        </button>
      </section>
    )
  }

  return (
    <section className="form-page">
      <h1>Créer un événement</h1>
      {reference.status === 'loading' && <p>Chargement des lieux et des catégories…</p>}
      {reference.status === 'error' && (
        <p role="alert">Impossible de charger les lieux et les catégories. {reference.message}</p>
      )}
      {reference.status === 'ready' && (
        <EventForm
          locations={reference.locations}
          categories={reference.categories}
          onCreated={setCreated}
        />
      )}
    </section>
  )
}

type EventFormProps = {
  locations: NamedRef[]
  categories: NamedRef[]
  onCreated: (event: Event) => void
}

function EventForm({ locations, categories, onCreated }: EventFormProps) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const payload = readPayload(new FormData(event.currentTarget))
    setFormError('')
    if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
      setFieldErrors({ endDate: 'La fin doit être après le début.' })
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const { data } = await api.post<Event>('/events', payload)
      onCreated(data)
    } catch (error) {
      const { status, code, message, fieldErrors: errors } = getApiError(error)
      if (status === 401) {
        // Session expirée : RequireRole renvoie alors vers la connexion.
        clearSession()
        return
      }
      const names = Object.keys(errors)
      if (code === 'VALIDATION_ERROR' && names.length) {
        setFieldErrors(errors)
        if (names.some((name) => !FIELD_NAMES.includes(name as FieldName))) setFormError(message)
      } else {
        setFormError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const describe = (name: FieldName) =>
    fieldErrors[name]
      ? { 'aria-invalid': true, 'aria-describedby': `event-${name}-error` }
      : undefined
  const errorOf = (name: FieldName) =>
    fieldErrors[name] && (
      <p id={`event-${name}-error`} role="alert">
        {fieldErrors[name]}
      </p>
    )

  return (
    <form className="event-form" onSubmit={submit}>
      <div>
        <label htmlFor="event-name">Nom de l’événement</label>
        <input id="event-name" name="name" required {...describe('name')} />
        {errorOf('name')}
      </div>
      <div>
        <label htmlFor="event-description">Description (facultatif)</label>
        <textarea id="event-description" name="description" rows={4} {...describe('description')} />
        {errorOf('description')}
      </div>
      <div>
        <label htmlFor="event-startDate">Début</label>
        <input
          id="event-startDate"
          name="startDate"
          type="datetime-local"
          required
          {...describe('startDate')}
        />
        {errorOf('startDate')}
      </div>
      <div>
        <label htmlFor="event-endDate">Fin</label>
        <input
          id="event-endDate"
          name="endDate"
          type="datetime-local"
          required
          {...describe('endDate')}
        />
        {errorOf('endDate')}
      </div>
      <SelectField name="locationId" label="Lieu" options={locations} describe={describe}>
        {errorOf('locationId')}
      </SelectField>
      <SelectField name="categoryId" label="Catégorie" options={categories} describe={describe}>
        {errorOf('categoryId')}
      </SelectField>
      <div>
        <label htmlFor="event-capacity">Capacité</label>
        <input
          id="event-capacity"
          name="capacity"
          type="number"
          min={1}
          step={1}
          required
          {...describe('capacity')}
        />
        {errorOf('capacity')}
      </div>
      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Création…' : 'Créer l’événement'}
      </button>
    </form>
  )
}

type SelectFieldProps = {
  name: 'locationId' | 'categoryId'
  label: string
  options: NamedRef[]
  describe: (name: FieldName) => object | undefined
  /** Message d'erreur du champ, affiché sous la liste. */
  children?: ReactNode
}

function SelectField({ name, label, options, describe, children }: SelectFieldProps) {
  const id = `event-${name}`
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} required defaultValue="" {...describe(name)}>
        <option value="" disabled>
          Choisir…
        </option>
        {options.map(({ id: value, name: optionLabel }) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      {children}
    </div>
  )
}

function readPayload(data: FormData): EventInput {
  const text = (key: FieldName) => String(data.get(key) ?? '').trim()
  const description = text('description')
  return {
    name: text('name'),
    ...(description && { description }),
    startDate: toUtcIso(text('startDate')),
    endDate: toUtcIso(text('endDate')),
    locationId: text('locationId'),
    categoryId: text('categoryId'),
    capacity: Number(text('capacity')),
  }
}

// `datetime-local` donne une heure locale sans fuseau ; le contrat attend de l'ISO 8601 en UTC.
function toUtcIso(local: string): string {
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? local : date.toISOString()
}
