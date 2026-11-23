import type { Event } from '../api/types'

/**
 * Événements simulés, partagés par les mocks qui les lisent ou les modifient : un événement
 * créé par `POST /events` est ensuite visible dans « Mes événements » et modifiable.
 * Chaque jeton a sa propre copie, pour que deux sessions simulées ne se mélangent pas.
 */
export type EventStore = {
  eventsFor: (request: Request) => Event[]
}

export function createEventStore(initial: Event[]): EventStore {
  const lists = new Map<string, Event[]>()
  return {
    eventsFor(request) {
      const token = request.headers.get('Authorization') ?? ''
      let events = lists.get(token)
      if (!events) {
        events = structuredClone(initial)
        lists.set(token, events)
      }
      return events
    },
  }
}
