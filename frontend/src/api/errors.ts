import { isAxiosError } from 'axios'
import type { ApiErrorCode } from './types'

export const NETWORK_ERROR_MESSAGE =
  'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.'
export const UNEXPECTED_ERROR_MESSAGE = 'Une erreur inattendue est survenue. Réessayez plus tard.'

// Codes d'erreur du contrat v0.1. `satisfies` refuse toute valeur absente de l'OpenAPI.
const KNOWN_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_ALREADY_USED',
  'INSUFFICIENT_SEATS',
  'ACTIVE_BOOKINGS',
  'CAPACITY_BELOW_RESERVED',
] as const satisfies readonly ApiErrorCode[]

export type ParsedApiError = {
  /** Statut HTTP, ou `null` si le serveur n'a pas répondu. */
  status: number | null
  /** Code du contrat, ou `null` s'il est absent ou inconnu. */
  code: ApiErrorCode | null
  /** Message à afficher à l'utilisateur. */
  message: string
  /** Erreurs de `VALIDATION_ERROR` par nom de champ, pour les afficher sous le formulaire. */
  fieldErrors: Record<string, string>
}

/** Convertit n'importe quelle erreur d'appel API en un format prêt à afficher. */
export function getApiError(error: unknown): ParsedApiError {
  if (!isAxiosError(error)) {
    return fallback(null, UNEXPECTED_ERROR_MESSAGE)
  }
  if (!error.response) {
    return fallback(null, NETWORK_ERROR_MESSAGE)
  }

  const { status, data } = error.response
  if (!isRecord(data) || typeof data.message !== 'string') {
    return fallback(status, UNEXPECTED_ERROR_MESSAGE)
  }

  return {
    status,
    code: toKnownCode(data.code),
    message: data.message,
    fieldErrors: toFieldErrors(data.details),
  }
}

function fallback(status: number | null, message: string): ParsedApiError {
  return { status, code: null, message, fieldErrors: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toKnownCode(value: unknown): ApiErrorCode | null {
  return KNOWN_ERROR_CODES.find((code) => code === value) ?? null
}

function toFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) {
    return {}
  }
  const entries = details
    .filter(isRecord)
    .filter((item) => typeof item.field === 'string' && typeof item.message === 'string')
    .map((item) => [item.field as string, item.message as string] as const)

  // Si un champ a plusieurs erreurs, on garde la première pour l'affichage.
  return entries.reduce<Record<string, string>>(
    (acc, [field, message]) => (field in acc ? acc : { ...acc, [field]: message }),
    {},
  )
}
