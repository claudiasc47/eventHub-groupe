import type { ReactNode } from 'react'
import type { Event } from '../api/types'

const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

type EventCardProps = {
  event: Event
  badge?: ReactNode
  children: ReactNode
}

/** Carte d'un événement, partagée par le catalogue et « Mes événements ». */
export function EventCard({ event, badge, children }: EventCardProps) {
  const { remainingSeats, capacity } = event
  return (
    <li className="booking-card event-card">
      {badge}
      <h2>{event.name}</h2>
      {event.description && <p className="event-description">{event.description}</p>}
      <p>
        <time dateTime={event.startDate}>{dates.format(new Date(event.startDate))}</time>
      </p>
      <p>
        Jusqu’au <time dateTime={event.endDate}>{dates.format(new Date(event.endDate))}</time>
      </p>
      <p>
        {event.location.name} · {event.category.name}
      </p>
      <p>
        {remainingSeats === 0 ? (
          <strong>Complet</strong>
        ) : (
          <>
            <strong>{remainingSeats}</strong>{' '}
            {remainingSeats > 1 ? 'places disponibles' : 'place disponible'} sur {capacity}
          </>
        )}
      </p>
      <div className="event-card-actions">{children}</div>
    </li>
  )
}
