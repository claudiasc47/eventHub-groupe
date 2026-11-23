import { useEffect, useState } from 'react'
import { api } from './client'
import { getApiError } from './errors'
import type { NamedRef } from './types'

export type ReferenceData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; locations: NamedRef[]; categories: NamedRef[] }

// Lieux et catégories (routes publiques) pour les formulaires et les filtres du catalogue.
export function useReferenceData(): ReferenceData {
  const [state, setState] = useState<ReferenceData>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.all([
      api.get<NamedRef[]>('/locations', { signal }),
      api.get<NamedRef[]>('/categories', { signal }),
    ])
      .then(([locations, categories]) =>
        setState({ status: 'ready', locations: locations.data, categories: categories.data }),
      )
      .catch((error: unknown) => {
        if (!signal.aborted) {
          setState({ status: 'error', message: getApiError(error).message })
        }
      })

    return () => controller.abort()
  }, [])

  return state
}
