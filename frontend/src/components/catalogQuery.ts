import type { EventSearchQuery } from '../api/useEventSearch'

export const CATALOG_PAGE_SIZE = 12

export type Sort = NonNullable<EventSearchQuery['sort']>

export type Filters = {
  q: string
  categoryId: string
  locationId: string
  dateFrom: string
  dateTo: string
  sort: Sort
}

const DEFAULT_SORT: Sort = 'startDate:asc'

export function today(): string {
  const now = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// dateFrom absent : à partir d'aujourd'hui ; dateFrom vide : sans borne.
export function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    categoryId: params.get('categoryId') ?? '',
    locationId: params.get('locationId') ?? '',
    dateFrom: params.get('dateFrom') ?? today(),
    dateTo: params.get('dateTo') ?? '',
    sort: params.get('sort') === 'startDate:desc' ? 'startDate:desc' : DEFAULT_SORT,
  }
}

export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isSafeInteger(page) && page > 1 ? page : 1
}

export function toSearchParams(filters: Filters, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  const { q, categoryId, locationId, dateFrom, dateTo, sort } = filters
  if (q.trim()) params.set('q', q.trim())
  if (categoryId) params.set('categoryId', categoryId)
  if (locationId) params.set('locationId', locationId)
  if (dateFrom !== today()) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (sort !== DEFAULT_SORT) params.set('sort', sort)
  if (page > 1) params.set('page', String(page))
  return params
}

export function hasActiveFilters(filters: Filters): boolean {
  return toSearchParams({ ...filters, sort: DEFAULT_SORT }).size > 0
}

export function toQuery(filters: Filters, page: number): EventSearchQuery {
  const query: EventSearchQuery = { page, pageSize: CATALOG_PAGE_SIZE, sort: filters.sort }
  for (const key of ['q', 'categoryId', 'locationId', 'dateFrom', 'dateTo'] as const) {
    const value = filters[key].trim()
    if (value) query[key] = value
  }
  return query
}
