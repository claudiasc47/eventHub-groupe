import { useSyncExternalStore } from 'react'
import { readToken, TOKEN_STORAGE_KEY } from '../api/client'
import type { LoginResponse } from '../api/types'

const SESSION_CHANGE = 'eventhub:session-change'

export function saveSession({ access_token, user }: LoginResponse) {
  try {
    localStorage.setItem('role', user.role)
    localStorage.setItem('email', user.email)
    localStorage.setItem(TOKEN_STORAGE_KEY, access_token)
  } catch (error) {
    clearSession()
    throw error
  }
  window.dispatchEvent(new Event(SESSION_CHANGE))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem('role')
  localStorage.removeItem('email')
  window.dispatchEvent(new Event(SESSION_CHANGE))
}

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_CHANGE, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(SESSION_CHANGE, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useSessionToken() {
  return useSyncExternalStore(subscribe, readToken)
}
