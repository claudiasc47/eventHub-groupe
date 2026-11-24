import { Link } from 'react-router'
import type { Event } from '../api/types'

const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' })

function seatsLabel({ remainingSeats, capacity }: Event): string {
  if (remainingSeats === 0) return 'Complet'
  const places = remainingSeats > 1 ? 'places disponibles' : 'place disponible'
  return `${remainingSeats} ${places} sur ${capacity}`
}

/** Carte d'un événement publié, avec un lien vers sa page de détail. */
export function EventCard({ event }: { event: Event }) {
  return (
    <li className="booking-card event-card">
      <span className="booking-badge">{event.category.name}</span>
      <h2>{event.name}</h2>
      {event.description && <p className="event-description">{event.description}</p>}
      <p>
        <time dateTime={event.startDate}>{dates.format(new Date(event.startDate))}</time>
      </p>
      <p>{event.location.name}</p>
      <p className={event.remainingSeats === 0 ? 'event-full' : undefined}>{seatsLabel(event)}</p>
      <Link
        className="button-link"
        to={`/events/${event.id}`}
        aria-label={`Voir le détail : ${event.name}`}
      >
        Voir le détail
      </Link>
    </li>
  )
}
