import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Event, NamedRef } from '../api/types'
import { useReferenceData } from '../api/useReferenceData'
import { clearSession } from '../auth/session'
import { EventFormFields } from '../components/EventFormFields'
import {
  EMPTY_EVENT_FORM,
  isEventField,
  toEventInput,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from '../components/eventForm'

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
  const [values, setValues] = useState<EventFormValues>(EMPTY_EVENT_FORM)
  const [fieldErrors, setFieldErrors] = useState<EventFormErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setFormError('')
    const errors = validateEventForm(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setIsSubmitting(true)
    try {
      const { data } = await api.post<Event>('/events', toEventInput(values))
      onCreated(data)
    } catch (error) {
      const { status, code, message, fieldErrors: apiErrors } = getApiError(error)
      if (status === 401) {
        // Session expirée : RequireRole renvoie alors vers la connexion.
        clearSession()
        return
      }
      const names = Object.keys(apiErrors)
      if (code === 'VALIDATION_ERROR' && names.length) {
        setFieldErrors(apiErrors)
        if (!names.every(isEventField)) setFormError(message)
      } else {
        setFormError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="event-form" onSubmit={submit} noValidate>
      <EventFormFields
        values={values}
        errors={fieldErrors}
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        locations={locations}
        categories={categories}
      />
      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Création…' : 'Créer l’événement'}
      </button>
    </form>
  )
}
