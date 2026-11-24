import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useEventSearch } from '../api/useEventSearch'
import { CatalogFilters } from '../components/CatalogFilters'
import { CatalogResults } from '../components/CatalogResults'
import {
  hasActiveFilters,
  readFilters,
  readPage,
  toQuery,
  toSearchParams,
  type Filters,
} from '../components/catalogQuery'

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const page = readPage(params)
  const { state, isUpdating, retry } = useEventSearch(toQuery(filters, page))

  const changeFilters = useCallback(
    (patch: Partial<Filters>, options?: { replace?: boolean }) =>
      setParams((current) => toSearchParams({ ...readFilters(current), ...patch }), options),
    [setParams],
  )
  const changePage = (next: number) =>
    setParams((current) => toSearchParams(readFilters(current), next))

  return (
    <section className="catalog-page">
      <header className="bookings-hero">
        <div>
          <p className="eyebrow">Événements</p>
          <h1>Catalogue</h1>
          <p>Trouvez un événement par mot-clé, catégorie, lieu ou date.</p>
        </div>
      </header>
      <CatalogFilters filters={filters} onChange={changeFilters} />
      <CatalogResults
        state={state}
        isUpdating={isUpdating}
        isFiltered={hasActiveFilters(filters)}
        page={page}
        onRetry={retry}
        onPage={changePage}
        onReset={() => setParams(new URLSearchParams())}
      />
    </section>
  )
}
