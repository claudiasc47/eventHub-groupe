import { http, HttpResponse } from 'msw/http'
import type {
  ApiError,
  FieldError,
  LoginInput,
  LoginResponse,
  RegisterInput,
  User,
} from '../api/types'

export const demoUser: User = {
  id: '17de1089-12ef-46d3-89ab-916db978cbb5',
  email: 'demo@example.test',
  pseudo: 'demo-eventhub',
  firstName: 'Camille',
  lastName: 'Martin',
  phone: '0601020304',
  birthDate: '1998-07-21',
  role: 'participant',
}

export const demoPassword = 'demo-eventhub'

function error(statusCode: number, code: ApiError['code'], message: string) {
  return HttpResponse.json<ApiError>({ statusCode, code, message }, { status: statusCode })
}

function validationError(details: FieldError[]) {
  return HttpResponse.json(
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Certaines données sont invalides.',
      details,
    },
    { status: 400 },
  )
}

function isDateOnly(value: string) {
  const date = new Date(value)
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(+date) &&
    date.toISOString().slice(0, 10) === value
  )
}

export function createAuthHandlers(baseURL: string) {
  const base = baseURL.replace(/\/$/, '')
  const accounts = new Map([[demoUser.email, { user: demoUser, password: demoPassword }]])
  const sessions = new Map<string, User>()

  return [
    http.post(`${base}/users/register`, async ({ request }) => {
      const input = (await request.json()) as RegisterInput
      const details: FieldError[] = []
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        details.push({ field: 'email', message: 'Saisissez une adresse e-mail valide.' })
      }
      if (typeof input.password !== 'string' || input.password.length < 8) {
        details.push({ field: 'password', message: 'Saisissez au moins 8 caractères.' })
      }
      if (typeof input.pseudo !== 'string' || input.pseudo.length < 3 || input.pseudo.length > 30) {
        details.push({ field: 'pseudo', message: 'Saisissez de 3 à 30 caractères.' })
      }
      if (input.birthDate != null && !isDateOnly(input.birthDate)) {
        details.push({ field: 'birthDate', message: 'Utilisez le format YYYY-MM-DD.' })
      }
      if (details.length) return validationError(details)

      const email = input.email.toLowerCase()
      if (accounts.has(email)) {
        return error(409, 'EMAIL_ALREADY_USED', 'Cette adresse e-mail est déjà utilisée.')
      }

      const user: User = {
        id: crypto.randomUUID(),
        email,
        pseudo: input.pseudo,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        birthDate: input.birthDate ?? null,
        role: 'participant',
      }
      accounts.set(user.email, { user, password: input.password })
      return HttpResponse.json(user, { status: 201 })
    }),
    http.post(`${base}/auth/login`, async ({ request }) => {
      const { email, password } = (await request.json()) as LoginInput
      const details: FieldError[] = []
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        details.push({ field: 'email', message: 'Saisissez une adresse e-mail valide.' })
      }
      if (!password) {
        details.push({ field: 'password', message: 'Saisissez un mot de passe.' })
      }
      if (details.length) return validationError(details)

      const account = accounts.get(email.toLowerCase())
      if (!account || account.password !== password) {
        return error(401, 'UNAUTHENTICATED', 'Email ou mot de passe incorrect.')
      }

      const access_token = crypto.randomUUID()
      sessions.set(access_token, account.user)
      return HttpResponse.json<LoginResponse>({ access_token, user: account.user })
    }),
    http.get(`${base}/users/me`, ({ request }) => {
      const authorization = request.headers.get('Authorization')
      const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
      const user = token ? sessions.get(token) : undefined
      if (!user) return error(401, 'UNAUTHENTICATED', 'Session invalide ou expirée.')
      return HttpResponse.json(user)
    }),
  ]
}
