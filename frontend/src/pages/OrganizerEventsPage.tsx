import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Event, User } from '../api/types'
import { clearSession, useSessionToken } from '../auth/session'

type Filter = 'ALL' | 'DRAFT' | 'PUBLISHED'
const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

export function OrganizerEventsPage() {
  const token = useSessionToken()
  return token ? <OrganizerEvents key={token} /> : <Navigate to="/login" replace />
}

function OrganizerEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const { data: user } = await api.get<User>('/users/me', { signal: controller.signal })
        if (controller.signal.aborted) return
        if (user.role !== 'organizer') {
          setForbidden(true)
          return
        }
        const { data } = await api.get<Event[]>('/me/events', { signal: controller.signal })
        if (!controller.signal.aborted) {
          setEvents([...data].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate) || a.id.localeCompare(b.id)))
        }
      } catch (failure) {
        if (controller.signal.aborted) return
        const parsed = getApiError(failure)
        if (parsed.status === 401) clearSession()
        else if (parsed.status === 403) setForbidden(true)
        else setError(parsed.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt])

  const visible = events.filter((event) => filter === 'ALL' || event.status === filter)
  const drafts = events.filter((event) => event.status === 'DRAFT').length

  return (
    <section className="organizer-page">
      <header className="bookings-hero">
        <div>
          <p className="eyebrow">Espace organisateur</p>
          <h1>Mes événements</h1>
          <p>Retrouvez vos brouillons et vos événements publiés, et suivez les places disponibles.</p>
          {!loading && !forbidden && !error && <Link className="button-link" to="/events/new">Créer un événement</Link>}
        </div>
      </header>
      {import.meta.env.DEV && import.meta.env.VITE_MOCK_ORGANIZER === 'true' && (
        <p className="demo-notice">Mode démonstration : le compte organisateur et ses événements sont simulés.</p>
      )}
      {loading ? <p role="status">Chargement de vos événements…</p> : forbidden ? (
        <div className="state-panel"><h2>Accès réservé aux organisateurs</h2>
          <p>Votre compte ne permet pas d’accéder à cet espace.</p><Link to="/">Retour au catalogue</Link>
        </div>
      ) : error ? (
        <div className="state-panel"><p role="alert">{error}</p>
          <button onClick={() => { setLoading(true); setError(''); setForbidden(false); setAttempt((value) => value + 1) }}>Réessayer</button>
        </div>
      ) : events.length === 0 ? (
        <div className="state-panel"><h2>Votre premier événement commence ici</h2>
          <p>Vous n’avez pas encore créé d’événement. Préparez votre première rencontre.</p>
          <Link to="/events/new">Créer mon premier événement</Link>
        </div>
      ) : (
        <>
          <dl className="organizer-summary" aria-label="Bilan de vos événements">
            <div><dt>Au total</dt><dd>{events.length}</dd></div>
            <div><dt>Brouillons</dt><dd>{drafts}</dd></div>
            <div><dt>Publiés</dt><dd>{events.length - drafts}</dd></div>
          </dl>
          <div className="event-filters" role="group" aria-label="Filtrer par statut">
            {([
              ['ALL', 'Tous'], ['DRAFT', 'Brouillons'], ['PUBLISHED', 'Publiés'],
            ] as const).map(([value, label]) => (
              <button key={value} className="secondary-button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <p role="status">{visible.length} {visible.length > 1 ? 'événements affichés' : 'événement affiché'}</p>
          {visible.length === 0 ? <div className="state-panel"><h2>Aucun événement pour ce statut</h2><p>Choisissez un autre filtre pour retrouver vos événements.</p></div> : (
            <ul className="booking-list" aria-label="Vos événements">
              {visible.map((event) => (
                <li key={event.id} className="booking-card">
                  <span className={`booking-badge ${event.status === 'DRAFT' ? 'cancelled' : ''}`}>{event.status === 'DRAFT' ? 'Brouillon' : 'Publié'}</span>
                  <h2>{event.name}</h2>
                  {event.description && <p className="event-description">{event.description}</p>}
                  <p><time dateTime={event.startDate}>{dates.format(new Date(event.startDate))}</time></p>
                  <p>Jusqu’au <time dateTime={event.endDate}>{dates.format(new Date(event.endDate))}</time></p>
                  <p>{event.location.name} · {event.category.name}</p>
                  <p><strong>{event.remainingSeats}</strong> places disponibles sur {event.capacity}</p>
                  <Link className="button-link" to={`/events/${event.id}/edit`}>Modifier {event.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
