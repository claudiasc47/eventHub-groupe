import { useEffect, useState } from 'react'
import { api } from './client'
import { getApiError } from './errors'
import type { EventPage } from './types'

export type EventSearchQuery = {
  q?: string
  categoryId?: string
  locationId?: string
  dateFrom?: string
  dateTo?: string
  sort?: 'startDate:asc' | 'startDate:desc'
  page: number
  pageSize: number
}

type Outcome = { status: 'error'; message: string } | { status: 'ready'; result: EventPage }

export type EventSearchState = { status: 'loading' } | Outcome

// Garde le dernier résultat affiché pendant la mise à jour (isUpdating).
export function useEventSearch(query: EventSearchQuery): {
  state: EventSearchState
  isUpdating: boolean
  retry: () => void
} {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; outcome: Outcome } | null>(null)
  const params = JSON.stringify(query)
  const key = `${params}#${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    api
      .get<EventPage>('/events', {
        params: JSON.parse(params) as EventSearchQuery,
        signal: controller.signal,
      })
      .then(({ data }) => setLoaded({ key, outcome: { status: 'ready', result: data } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ key, outcome: { status: 'error', message: getApiError(error).message } })
        }
      })
    return () => controller.abort()
  }, [params, key])

  return {
    state: loaded ? loaded.outcome : { status: 'loading' },
    isUpdating: loaded !== null && loaded.key !== key,
    retry: () => setAttempt((value) => value + 1),
  }
}
