import type { Event } from '../api/types'

// Liste partagée par les mocks, une copie par jeton.
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
