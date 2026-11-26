type Origin = { pathname: string; search: string }

export type BackState = { from: Origin }
export type BackLink = { to: string; label: string }

const LABELS = new Map([
  ['/', 'Retour au catalogue'],
  ['/calendar', 'Retour au calendrier'],
  ['/me/events', 'Retour à mes événements'],
])

const DEFAULT_BACK: BackLink = { to: '/', label: 'Retour au catalogue' }

export function toBackState({ pathname, search }: Origin): BackState {
  return { from: { pathname, search } }
}

export function readBackLink(state: unknown): BackLink {
  const from = (state as Partial<BackState> | null)?.from
  if (typeof from?.pathname !== 'string' || typeof from.search !== 'string') return DEFAULT_BACK
  const label = LABELS.get(from.pathname)
  if (!label || (from.search !== '' && !from.search.startsWith('?'))) return DEFAULT_BACK
  return { to: `${from.pathname}${from.search}`, label }
}
