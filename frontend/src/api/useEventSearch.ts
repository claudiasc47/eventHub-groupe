import { useEffect, useState } from 'react'
import { api } from './client'
import { getApiError } from './errors'
import type { EventPage } from './types'

/** Paramètres de `GET /events` (contrat v0.1). Les valeurs absentes ne sont pas envoyées. */
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

/**
 * Charge une page du catalogue à chaque changement de `query`. La requête précédente est
 * annulée : la réponse affichée correspond toujours aux derniers filtres.
 */
export function useEventSearch(query: EventSearchQuery): {
  state: EventSearchState
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

  // Tant que la réponse aux paramètres courants n'est pas arrivée, l'état est « chargement ».
  const state: EventSearchState = loaded?.key === key ? loaded.outcome : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
