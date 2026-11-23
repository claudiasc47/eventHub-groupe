import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { LoginInput, LoginResponse } from '../api/types'
import { saveSession } from '../auth/session'

export function LoginPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const form = new FormData(event.currentTarget)
    const payload: LoginInput = {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    }

    setFormError('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', payload)
      saveSession(data)
      navigate('/profile', { replace: true })
    } catch (error) {
      const { status, message } = getApiError(error)
      setFormError(status === 401 ? 'Email ou mot de passe incorrect.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <h1>Connexion</h1>
      <form className="auth-form" onSubmit={login}>
        <div>
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p>
        <Link to="/register">Créer un compte</Link>
      </p>
    </section>
  )
}
