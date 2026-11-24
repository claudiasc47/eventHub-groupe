import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import type { NamedRef } from '../api/types'
import { useEventSearch, type EventSearchQuery } from '../api/useEventSearch'
import { useReferenceData } from '../api/useReferenceData'
import { EventCard } from '../components/EventCard'

const CATALOG_PAGE_SIZE = 12

type Sort = NonNullable<EventSearchQuery['sort']>

/** Filtres tels qu'ils apparaissent dans l'URL et dans le formulaire (texte). */
type Filters = {
  q: string
  categoryId: string
  locationId: string
  dateFrom: string
  dateTo: string
  sort: Sort
}

const FILTER_KEYS = ['q', 'categoryId', 'locationId', 'dateFrom', 'dateTo', 'sort'] as const

/** Date du jour au format `YYYY-MM-DD`, dans le fuseau de l'utilisateur. */
function today(): string {
  const now = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Sans `dateFrom` dans l'URL, le catalogue part du jour courant (le contrat renvoie aussi les
// événements passés). Un `dateFrom` vide dans l'URL signifie « sans date de début ».
function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    categoryId: params.get('categoryId') ?? '',
    locationId: params.get('locationId') ?? '',
    dateFrom: params.get('dateFrom') ?? today(),
    dateTo: params.get('dateTo') ?? '',
    sort: params.get('sort') === 'startDate:desc' ? 'startDate:desc' : 'startDate:asc',
  }
}

function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isSafeInteger(page) && page > 1 ? page : 1
}

function toSearchParams(filters: Filters, page: number): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key].trim()
    if (key === 'dateFrom' ? value !== today() : value && value !== 'startDate:asc') {
      params.set(key, value)
    }
  }
  if (page > 1) params.set('page', String(page))
  return params
}

function toQuery(filters: Filters, page: number): EventSearchQuery {
  const query: EventSearchQuery = { page, pageSize: CATALOG_PAGE_SIZE, sort: filters.sort }
  for (const key of ['q', 'categoryId', 'locationId', 'dateFrom', 'dateTo'] as const) {
    const value = filters[key].trim()
    if (value) query[key] = value
  }
  return query
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const page = readPage(params)
  const { state, retry } = useEventSearch(toQuery(filters, page))

  const goTo = (nextFilters: Filters, nextPage = 1) =>
    setParams(toSearchParams(nextFilters, nextPage))

  return (
    <section className="catalog-page">
      <header className="bookings-hero">
        <div>
          <p className="eyebrow">Événements</p>
          <h1>Catalogue</h1>
          <p>Trouvez un événement par mot-clé, catégorie, lieu ou date.</p>
        </div>
      </header>
      {/* `key` : le formulaire reprend les filtres de l'URL après un retour arrière. */}
      <FilterForm key={params.toString()} initial={filters} onSearch={goTo} />
      <Results state={state} page={page} onRetry={retry} onPage={(next) => goTo(filters, next)} />
    </section>
  )
}

type FilterFormProps = {
  initial: Filters
  onSearch: (filters: Filters) => void
}

function FilterForm({ initial, onSearch }: FilterFormProps) {
  const reference = useReferenceData()
  const [draft, setDraft] = useState(initial)
  const set = (key: keyof Filters) => (value: string) => setDraft({ ...draft, [key]: value })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(draft)
  }

  const options = (items: NamedRef[] | undefined) =>
    items?.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    ))
  const locations = reference.status === 'ready' ? reference.locations : undefined
  const categories = reference.status === 'ready' ? reference.categories : undefined

  return (
    <form
      className="catalog-filters"
      role="search"
      aria-label="Filtrer les événements"
      onSubmit={submit}
    >
      <div className="catalog-search">
        <label htmlFor="catalog-q">Recherche</label>
        <input
          id="catalog-q"
          type="search"
          placeholder="Nom ou description"
          value={draft.q}
          onChange={(event) => set('q')(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="catalog-categoryId">Catégorie</label>
        <select
          id="catalog-categoryId"
          value={draft.categoryId}
          onChange={(event) => set('categoryId')(event.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {options(categories)}
        </select>
      </div>
      <div>
        <label htmlFor="catalog-locationId">Lieu</label>
        <select
          id="catalog-locationId"
          value={draft.locationId}
          onChange={(event) => set('locationId')(event.target.value)}
        >
          <option value="">Tous les lieux</option>
          {options(locations)}
        </select>
      </div>
      <div>
        <label htmlFor="catalog-dateFrom">À partir du</label>
        <input
          id="catalog-dateFrom"
          type="date"
          value={draft.dateFrom}
          onChange={(event) => set('dateFrom')(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="catalog-dateTo">Jusqu’au</label>
        <input
          id="catalog-dateTo"
          type="date"
          min={draft.dateFrom || undefined}
          value={draft.dateTo}
          onChange={(event) => set('dateTo')(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="catalog-sort">Ordre</label>
        <select
          id="catalog-sort"
          value={draft.sort}
          onChange={(event) => set('sort')(event.target.value)}
        >
          <option value="startDate:asc">Les plus proches</option>
          <option value="startDate:desc">Les plus lointains</option>
        </select>
      </div>
      {reference.status === 'error' && (
        <p role="alert" className="catalog-filters-note">
          Les catégories et les lieux n’ont pas pu être chargés. {reference.message}
        </p>
      )}
      <button type="submit">Rechercher</button>
    </form>
  )
}

type ResultsProps = {
  state: ReturnType<typeof useEventSearch>['state']
  page: number
  onRetry: () => void
  onPage: (page: number) => void
}

function Results({ state, page, onRetry, onPage }: ResultsProps) {
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
  return (
    <>
      <p role="status">
        {total} {total > 1 ? 'événements trouvés' : 'événement trouvé'}
      </p>
      <ul className="booking-list" aria-label="Événements">
        {items.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ul>
      {pages > 1 && (
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
    </>
  )
}
