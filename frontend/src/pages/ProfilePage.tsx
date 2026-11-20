import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { User } from '../api/types'
import { clearSession, useSessionToken } from '../auth/session'

const profileFields = [
  ['pseudo', 'Pseudo'],
  ['email', 'E-mail'],
  ['role', 'Rôle'],
  ['firstName', 'Prénom'],
  ['lastName', 'Nom'],
  ['phone', 'Téléphone'],
  ['birthDate', 'Date de naissance'],
] as const satisfies ReadonlyArray<readonly [keyof User, string]>

export function ProfilePage() {
  const token = useSessionToken()
  return token ? <Profile key={token} /> : <Navigate to="/login" replace />
}

function Profile() {
  const [profile, setProfile] = useState<User | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const { data } = await api.get<User>('/users/me', { signal: controller.signal })
        if (!controller.signal.aborted) setProfile(data)
      } catch (error) {
        if (controller.signal.aborted) return
        const { status, message } = getApiError(error)
        if (status === 401) {
          clearSession()
        } else {
          setErrorMessage(message)
        }
      }
    }

    void loadProfile()
    return () => controller.abort()
  }, [])

  return (
    <section className="auth-page">
      <h1>Profil</h1>
      {!profile && !errorMessage && <p role="status">Chargement du profil…</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {profile && (
        <dl className="profile-details">
          {profileFields.map(([name, label]) => (
            <div key={name}>
              <dt>{label}</dt>
              <dd>{profile[name] ?? 'Non renseigné'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
