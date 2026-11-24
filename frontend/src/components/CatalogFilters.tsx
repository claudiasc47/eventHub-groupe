import { useEffect, useState, type FormEvent } from 'react'
import type { NamedRef } from '../api/types'
import { useReferenceData } from '../api/useReferenceData'
import type { Filters } from './catalogQuery'

export const SEARCH_DEBOUNCE_MS = 300

type CatalogFiltersProps = {
  filters: Filters
  onChange: (patch: Partial<Filters>, options?: { replace?: boolean }) => void
}

export function CatalogFilters({ filters, onChange }: CatalogFiltersProps) {
  const reference = useReferenceData()
  const [text, setText] = useState(filters.q)
  const [appliedText, setAppliedText] = useState(filters.q)

  // Resynchronise après « Précédent », sans écraser l'espace en cours de saisie.
  if (filters.q !== appliedText) {
    setAppliedText(filters.q)
    if (filters.q !== text.trim()) setText(filters.q)
  }

  useEffect(() => {
    if (text.trim() === filters.q) return
    const timer = setTimeout(() => onChange({ q: text }, { replace: true }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, filters.q, onChange])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text.trim() !== filters.q) onChange({ q: text })
  }

  const options = (items: NamedRef[] | undefined) =>
    items?.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    ))
  const ready = reference.status === 'ready' ? reference : undefined

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
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="catalog-categoryId">Catégorie</label>
        <select
          id="catalog-categoryId"
          value={filters.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="">Toutes les catégories</option>
          {options(ready?.categories)}
        </select>
      </div>
      <div>
        <label htmlFor="catalog-locationId">Lieu</label>
        <select
          id="catalog-locationId"
          value={filters.locationId}
          onChange={(event) => onChange({ locationId: event.target.value })}
        >
          <option value="">Tous les lieux</option>
          {options(ready?.locations)}
        </select>
      </div>
      <div>
        <label htmlFor="catalog-dateFrom">À partir du</label>
        <input
          id="catalog-dateFrom"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => onChange({ dateFrom: event.target.value })}
        />
      </div>
      <div>
        <label htmlFor="catalog-dateTo">Jusqu’au</label>
        <input
          id="catalog-dateTo"
          type="date"
          min={filters.dateFrom || undefined}
          value={filters.dateTo}
          onChange={(event) => onChange({ dateTo: event.target.value })}
        />
      </div>
      <div>
        <label htmlFor="catalog-sort">Ordre</label>
        <select
          id="catalog-sort"
          value={filters.sort}
          onChange={(event) => onChange({ sort: event.target.value as Filters['sort'] })}
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
    </form>
  )
}
