import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, readToken } from '../api/client'
import { getApiError } from '../api/errors'
import type { Role, RoleInput, User } from '../api/types'
import { clearSession, useSessionToken } from '../auth/session'

const roleLabels: Record<Role, string> = {
  participant: 'Participant',
  organizer: 'Organisateur',
  admin: 'Administrateur',
}

type UsersState =
  | { kind: 'loading' }
  | { kind: 'ready'; users: User[] }
  | { kind: 'error'; message: string; retryable: boolean }

export function AdminUsersPage() {
  const token = useSessionToken()
  return token ? <AdminUsers key={token} token={token} /> : null
}

function AdminUsers({ token }: { token: string }) {
  const [state, setState] = useState<UsersState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      try {
        const { data } = await api.get<User[]>('/users', { signal })
        if (!signal.aborted) setState({ kind: 'ready', users: data })
      } catch (failure) {
        if (signal.aborted) return
        const { status, message } = getApiError(failure)
        if (status === 401) {
          if (readToken() === token) clearSession()
          return
        }
        setState({
          kind: 'error',
          message: status === 403 ? 'Accès réservé aux administrateurs.' : message,
          retryable: status !== 403,
        })
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, token])

  function updateUser(updated: User) {
    setState((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            users: current.users.map((user) => (user.id === updated.id ? updated : user)),
          }
        : current,
    )
  }

  return (
    <section>
      <h1>Gestion des utilisateurs</h1>
      {state.kind === 'loading' && <p role="status">Chargement des utilisateurs…</p>}
      {state.kind === 'error' && (
        <div className="state-panel">
          <p role="alert">{state.message}</p>
          {state.retryable && (
            <button
              type="button"
              onClick={() => {
                setState({ kind: 'loading' })
                setAttempt((value) => value + 1)
              }}
            >
              Réessayer
            </button>
          )}
        </div>
      )}
      {state.kind === 'ready' &&
        (state.users.length === 0 ? (
          <p>Aucun utilisateur à afficher.</p>
        ) : (
          <>
            <p>Le nouveau rôle prend effet à la prochaine connexion du compte.</p>
            <div className="admin-users-table state-panel">
              <table aria-label="Comptes utilisateurs">
                <thead>
                  <tr>
                    <th scope="col">Pseudo</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Rôle actuel</th>
                    <th scope="col">Modifier le rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map((user) => (
                    <tr key={user.id}>
                      <th scope="row">{user.pseudo}</th>
                      <td>{user.email}</td>
                      <td>{roleLabels[user.role]}</td>
                      <td>
                        <RoleEditor user={user} token={token} onSave={updateUser} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </section>
  )
}

function RoleEditor({
  user,
  token,
  onSave,
}: {
  user: User
  token: string
  onSave: (updated: User) => void
}) {
  const pending = useRef<AbortController | null>(null)
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'status' | 'alert'; text: string } | null>(null)

  useEffect(() => () => pending.current?.abort(), [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || role === user.role) return

    const controller = new AbortController()
    const { signal } = controller
    pending.current = controller
    setSaving(true)
    setFeedback(null)
    try {
      const payload: RoleInput = { role }
      const { data } = await api.patch<User>(
        `/users/${encodeURIComponent(user.id)}/role`,
        payload,
        {
          signal,
        },
      )
      if (signal.aborted) return
      onSave(data)
      setRole(data.role)
      setFeedback({ type: 'status', text: 'Rôle mis à jour.' })
    } catch (failure) {
      if (signal.aborted) return
      const { status, message, fieldErrors } = getApiError(failure)
      if (status === 401) {
        if (readToken() === token) clearSession()
        return
      }
      setFeedback({ type: 'alert', text: fieldErrors.role ?? message })
    } finally {
      pending.current = null
      if (!signal.aborted) setSaving(false)
    }
  }

  return (
    <>
      <form className="admin-role-form" onSubmit={save}>
        <select
          aria-label={`Nouveau rôle de ${user.email}`}
          value={role}
          disabled={saving}
          onChange={(event) => {
            setRole(event.currentTarget.value as Role)
            setFeedback(null)
          }}
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label={`Enregistrer le rôle de ${user.email}`}
          disabled={saving || role === user.role}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
      {feedback && <p role={feedback.type}>{feedback.text}</p>}
    </>
  )
}
