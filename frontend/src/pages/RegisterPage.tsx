import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../api/client'
import { getApiError, NETWORK_ERROR_MESSAGE } from '../api/errors'
import type { RegisterInput, User } from '../api/types'

const fields = [
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email', required: true },
  {
    name: 'password',
    label: 'Mot de passe',
    type: 'password',
    autoComplete: 'new-password',
    required: true,
    minLength: 8,
  },
  {
    name: 'pseudo',
    label: 'Pseudo',
    autoComplete: 'nickname',
    required: true,
    minLength: 3,
    maxLength: 30,
  },
  { name: 'firstName', label: 'Prénom', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Nom', autoComplete: 'family-name' },
  { name: 'phone', label: 'Téléphone', type: 'tel', autoComplete: 'tel' },
  { name: 'birthDate', label: 'Date de naissance', type: 'date', autoComplete: 'bday' },
] satisfies ({ name: keyof RegisterInput; label: string } & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'autoComplete' | 'required' | 'minLength' | 'maxLength'
>)[]

export function RegisterPage() {
  const navigate = useNavigate()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const data = new FormData(event.currentTarget)
    const value = (key: keyof RegisterInput) => String(data.get(key) ?? '')
    const payload: RegisterInput = {
      email: value('email'),
      password: value('password'),
      pseudo: value('pseudo'),
      firstName: value('firstName') || undefined,
      lastName: value('lastName') || undefined,
      phone: value('phone') || undefined,
      birthDate: value('birthDate') || undefined,
    }

    setFieldErrors({})
    setFormError('')
    setIsSubmitting(true)

    try {
      await api.post<User>('/users/register', payload)
      navigate('/login', { replace: true })
    } catch (error) {
      const { code, message, fieldErrors: errors } = getApiError(error)
      if (code === 'EMAIL_ALREADY_USED') {
        setFieldErrors({ email: message })
      } else if (code === 'VALIDATION_ERROR') {
        setFieldErrors(errors)
        const names = Object.keys(errors)
        if (!names.length || names.some((name) => !fields.some((field) => field.name === name))) {
          setFormError(message)
        }
      } else {
        setFormError(
          message === NETWORK_ERROR_MESSAGE ? 'Impossible de créer le compte. Réessayez.' : message,
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <h1>Inscription</h1>
      <form className="auth-form" onSubmit={register}>
        {fields.map(({ name, label, ...attributes }) => {
          const id = `register-${name}`
          const error = fieldErrors[name]
          return (
            <div key={name}>
              <label htmlFor={id}>
                {label}
                {!attributes.required && ' (facultatif)'}
              </label>
              <input
                {...attributes}
                id={id}
                name={name}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error && (
                <p id={`${id}-error`} role="alert">
                  {error}
                </p>
              )}
            </div>
          )
        })}
        {formError && <p role="alert">{formError}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Création du compte…' : 'Créer le compte'}
        </button>
      </form>
      <p>
        <Link to="/login">Se connecter</Link>
      </p>
    </section>
  )
}
