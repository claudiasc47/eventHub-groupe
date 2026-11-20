import axios from 'axios'

// Clé localStorage du jeton d'accès, partagée avec le parcours de connexion.
export const TOKEN_STORAGE_KEY = 'token'

const baseURL = import.meta.env.VITE_API_URL?.trim()

if (!baseURL) {
  throw new Error(
    'VITE_API_URL est requise : copiez frontend/.env.example vers frontend/.env, puis relancez Vite.',
  )
}

// Client unique de l'API : tous les chemins sont relatifs à VITE_API_URL (préfixe /api inclus).
export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    // Stockage indisponible (navigation privée stricte) : la requête part sans jeton.
    return null
  }
}
