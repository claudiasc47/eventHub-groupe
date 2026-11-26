import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Event } from '../api/types'
import { useSessionToken } from '../auth/session'
import { readBackLink } from '../components/backLink'
import { EventBookingForm } from '../components/EventBookingForm'

const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

type EventState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; event: Event }

export function EventDetailPage() {
  const { id } = useParams<'id'>()
  const token = useSessionToken()
  const back = readBackLink(useLocation().state)

  return (
    <section className="event-detail-page">
      <Link to={back.to}>{back.label}</Link>
      {id ? (
        <EventDetail key={JSON.stringify([id, token])} id={id} token={token} />
      ) : (
        <h1>Événement introuvable</h1>
      )}
    </section>
  )
}

function EventDetail({ id, token }: { id: string; token: string | null }) {
  const [state, setState] = useState<EventState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      try {
        const { data: event } = await api.get<Event>(`/events/${encodeURIComponent(id)}`, {
          signal,
        })
        if (!signal.aborted) setState({ kind: 'ready', event })
      } catch (error) {
        if (signal.aborted) return
        const { status, message } = getApiError(error)
        if (status === 404 || status === 401 || status === 403) {
          setState({ kind: 'missing' })
        } else {
          setState({ kind: 'error', message })
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [id, attempt])

  if (state.kind === 'loading') {
    return <p role="status">Chargement de l’événement…</p>
  }

  if (state.kind === 'missing') {
    return (
      <div className="state-panel">
        <h1>Événement introuvable</h1>
        <p>Cet événement est indisponible. Vous pouvez revenir au catalogue.</p>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="state-panel">
        <h1>Détail de l’événement</h1>
        <p role="alert">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: 'loading' })
            setAttempt((value) => value + 1)
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  const { event } = state
  return (
    <article>
      <header className="bookings-hero">
        <div>
          {event.status === 'DRAFT' && <span className="booking-badge">Brouillon</span>}
          <h1>{event.name}</h1>
          {event.description && <p className="event-description">{event.description}</p>}
        </div>
      </header>
      <dl className="state-panel event-detail-facts">
        <div>
          <dt>Début</dt>
          <dd>
            <time dateTime={event.startDate}>{dates.format(new Date(event.startDate))}</time>
          </dd>
        </div>
        <div>
          <dt>Fin</dt>
          <dd>
            <time dateTime={event.endDate}>{dates.format(new Date(event.endDate))}</time>
          </dd>
        </div>
        <div>
          <dt>Lieu</dt>
          <dd>{event.location.name}</dd>
        </div>
        <div>
          <dt>Catégorie</dt>
          <dd>{event.category.name}</dd>
        </div>
        <div>
          <dt>Disponibilité</dt>
          <dd>
            {event.remainingSeats === 0
              ? 'Complet'
              : `${event.remainingSeats} ${event.remainingSeats === 1 ? 'place disponible' : 'places disponibles'} sur ${event.capacity}`}
          </dd>
        </div>
      </dl>
      {event.status === 'PUBLISHED' && (
        <EventBookingForm
          event={event}
          token={token}
          onSeatsChange={(remainingSeats) => {
            setState((current) =>
              current.kind === 'ready'
                ? { kind: 'ready', event: { ...current.event, remainingSeats } }
                : current,
            )
          }}
        />
      )}
    </article>
  )
}
