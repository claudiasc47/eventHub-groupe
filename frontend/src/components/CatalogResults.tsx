import { Link } from 'react-router'
import type { EventSearchState } from '../api/useEventSearch'
import { EventCard } from './EventCard'

type CatalogResultsProps = {
  state: EventSearchState
  isUpdating: boolean
  isFiltered: boolean
  page: number
  onRetry: () => void
  onPage: (page: number) => void
  onReset: () => void
}

export function CatalogResults(props: CatalogResultsProps) {
  const { state, isUpdating, isFiltered, page, onRetry, onPage, onReset } = props
  if (state.status === 'loading') return <p role="status">Chargement des événements…</p>
  if (state.status === 'error') {
    return (
      <div className="state-panel">
        <p role="alert">{state.message}</p>
        <button type="button" onClick={onRetry}>
          Réessayer
        </button>
      </div>
    )
  }

  const { items, total, pageSize } = state.result
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const summary = isUpdating
    ? 'Mise à jour des résultats…'
    : `${total} ${total > 1 ? 'événements trouvés' : 'événement trouvé'}`

  return (
    <div className="catalog-results" aria-busy={isUpdating || undefined}>
      <p role="status">{summary}</p>
      {items.length === 0 ? (
        <EmptyState
          isFiltered={isFiltered}
          isPastLastPage={total > 0}
          onReset={onReset}
          onFirstPage={() => onPage(1)}
        />
      ) : (
        <ul className="booking-list" aria-label="Événements">
          {items.map((event) => (
            <EventCard key={event.id} event={event}>
              <Link
                className="button-link"
                to={`/events/${event.id}`}
                aria-label={`Voir le détail : ${event.name}`}
              >
                Voir le détail
              </Link>
            </EventCard>
          ))}
        </ul>
      )}
      {pages > 1 && items.length > 0 && (
        <nav className="catalog-pagination" aria-label="Pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Page précédente
          </button>
          <span>
            Page {page} sur {pages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Page suivante
          </button>
        </nav>
      )}
    </div>
  )
}

type EmptyStateProps = {
  isFiltered: boolean
  isPastLastPage: boolean
  onReset: () => void
  onFirstPage: () => void
}

function EmptyState({ isFiltered, isPastLastPage, onReset, onFirstPage }: EmptyStateProps) {
  if (isPastLastPage) {
    return (
      <div className="state-panel">
        <h2>Cette page n’existe pas</h2>
        <p>Il y a moins de résultats que de pages demandées.</p>
        <button type="button" onClick={onFirstPage}>
          Revenir à la première page
        </button>
      </div>
    )
  }
  if (!isFiltered) {
    return (
      <div className="state-panel">
        <h2>Aucun événement à venir pour le moment</h2>
        <p>Les nouveaux événements apparaîtront ici dès leur publication.</p>
      </div>
    )
  }
  return (
    <div className="state-panel">
      <h2>Aucun événement ne correspond à votre recherche</h2>
      <p>Essayez un autre mot-clé, élargissez les dates ou retirez un filtre.</p>
      <button type="button" onClick={onReset}>
        Réinitialiser les filtres
      </button>
    </div>
  )
}
