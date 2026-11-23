import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../api/errors'
import type { ApiError, LoginResponse } from '../api/types'
import { createAuthHandlers, demoUser } from '../mocks/auth'

const base = import.meta.env.VITE_API_URL!
const registerURL = `${base}/users/register`
const loginURL = `${base}/auth/login`
const profileURL = `${base}/users/me`
const token = 'mock-access-token'
const password = 'm0t-de-passe'
const newEmail = 'claudia@example.test'
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  server.resetHandlers(...createAuthHandlers(base))
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  window.history.replaceState({}, '', path)
  return { user: userEvent.setup(), ...render(<App />) }
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>, email = newEmail) {
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Mot de passe'), password)
}

function expectSession(expectedToken: string | null, user = demoUser) {
  expect(localStorage.getItem('token')).toBe(expectedToken)
  expect(localStorage.getItem('role')).toBe(expectedToken ? user.role : null)
  expect(localStorage.getItem('email')).toBe(expectedToken ? user.email : null)
}

function storeSession(accessToken = token) {
  localStorage.setItem('token', accessToken)
  localStorage.setItem('role', demoUser.role)
  localStorage.setItem('email', demoUser.email)
}

function apiError(statusCode: number, code: ApiError['code'], message: string) {
  return HttpResponse.json({ statusCode, code, message }, { status: statusCode })
}

const failures = [
  {
    name: 'une panne réseau',
    response: () => HttpResponse.error(),
    message: NETWORK_ERROR_MESSAGE,
    registerMessage: 'Impossible de créer le compte. Réessayez.',
  },
  {
    name: 'un 503 sans corps',
    response: () => new HttpResponse(null, { status: 503 }),
    message: UNEXPECTED_ERROR_MESSAGE,
    registerMessage: UNEXPECTED_ERROR_MESSAGE,
  },
]

describe('Inscription', () => {
  it.each([false, true])('envoie le corps attendu (profil complet : %s)', async (fullProfile) => {
    const requests: unknown[] = []
    server.use(
      http.post(registerURL, async ({ request }) => {
        requests.push(await request.json())
        return HttpResponse.json(demoUser, { status: 201 })
      }),
    )
    const { user } = renderAt('/register')
    await enterCredentials(user)
    await user.type(screen.getByLabelText('Pseudo'), 'claudia')
    const optional = {
      firstName: 'Claudia',
      lastName: 'Martin',
      phone: '0601020304',
      birthDate: '2000-02-29',
    }
    if (fullProfile) {
      await user.type(screen.getByLabelText(/^Prénom/), optional.firstName)
      await user.type(screen.getByLabelText(/^Nom/), optional.lastName)
      await user.type(screen.getByLabelText(/^Téléphone/), optional.phone)
      fireEvent.change(screen.getByLabelText(/^Date de naissance/), {
        target: { value: optional.birthDate },
      })
    }

    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(requests).toEqual([
      {
        email: newEmail,
        password,
        pseudo: 'claudia',
        ...(fullProfile ? optional : {}),
      },
    ])
    expect(window.location.pathname).toBe('/login')
    expectSession(null)
  })

  it('relie chaque détail du 400 à son champ', async () => {
    server.use(
      http.post(registerURL, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'Certaines données sont invalides.',
            details: [
              { field: 'pseudo', message: 'Ce pseudo est invalide.' },
              { field: 'birthDate', message: 'Cette date est invalide.' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderAt('/register')
    await enterCredentials(user)
    await user.type(screen.getByLabelText('Pseudo'), 'claudia')
    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findAllByRole('alert')).toHaveLength(2)
    expect(screen.getByLabelText('Pseudo')).toHaveAccessibleDescription('Ce pseudo est invalide.')
    expect(screen.getByLabelText(/^Date de naissance/)).toHaveAccessibleDescription(
      'Cette date est invalide.',
    )
    expect(window.location.pathname).toBe('/register')
  })

  it('affiche le conflit sous l’e-mail et accepte sa correction', async () => {
    const { user } = renderAt('/register')
    await enterCredentials(user, demoUser.email)
    await user.type(screen.getByLabelText('Pseudo'), 'claudia')
    const submit = screen.getByRole('button', { name: 'Créer le compte' })
    await user.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette adresse e-mail est déjà utilisée.',
    )
    const email = screen.getByLabelText('E-mail')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    await user.clear(email)
    await user.type(email, newEmail)
    await user.click(submit)
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it.each(failures)(
    'affiche une erreur de repli après $name',
    async ({ response, registerMessage }) => {
      server.use(http.post(registerURL, response))
      const { user } = renderAt('/register')
      await enterCredentials(user)
      await user.type(screen.getByLabelText('Pseudo'), 'claudia')
      await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(registerMessage)
      expect(window.location.pathname).toBe('/register')
      expectSession(null)
    },
  )
})

describe('Connexion et profil', () => {
  it('transmet le jeton, affiche le chargement puis le profil, et se déconnecte localement', async () => {
    const calls: { method: string; authorization: string | null; body?: unknown }[] = []
    const login: LoginResponse = { access_token: token, user: demoUser }
    server.use(
      http.post(loginURL, async ({ request }) => {
        calls.push({
          method: request.method,
          authorization: request.headers.get('Authorization'),
          body: await request.json(),
        })
        return HttpResponse.json(login)
      }),
      http.get(profileURL, async ({ request }) => {
        calls.push({ method: request.method, authorization: request.headers.get('Authorization') })
        await delay(100)
        return HttpResponse.json(demoUser)
      }),
    )
    window.history.replaceState({}, '', '/profile')
    window.history.pushState({}, '', '/login')
    const { user } = renderAt('/login')
    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Chargement du profil…')
    expect(window.location.pathname).toBe('/profile')
    expectSession(token)
    expect(await screen.findByText(demoUser.pseudo)).toBeInTheDocument()
    for (const value of [
      demoUser.email,
      demoUser.role,
      demoUser.firstName,
      demoUser.lastName,
      demoUser.phone,
      demoUser.birthDate,
    ]) {
      expect(screen.getByText(value!)).toBeInTheDocument()
    }
    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expectSession(null)

    await act(async () => {
      const back = new Promise<void>((resolve) => {
        window.addEventListener('popstate', () => resolve(), { once: true })
      })
      window.history.back()
      await back
    })
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByText(demoUser.pseudo)).not.toBeInTheDocument()
    expect(calls).toEqual([
      { method: 'POST', authorization: null, body: { email: newEmail, password } },
      { method: 'GET', authorization: `Bearer ${token}` },
    ])
  })

  it('redirige un accès direct au profil sans jeton avant toute requête', async () => {
    let requests = 0
    server.use(
      http.get(profileURL, () => {
        requests++
        return apiError(401, 'UNAUTHENTICATED', 'Session invalide.')
      }),
    )
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('heading', { name: 'Profil' })).not.toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('affiche les quatre valeurs nulles après inscription et connexion sur les mocks partagés', async () => {
    const { user } = renderAt('/register')
    await enterCredentials(user)
    await user.type(screen.getByLabelText('Pseudo'), 'claudia')
    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    await screen.findByRole('heading', { name: 'Connexion' })
    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findAllByText('Non renseigné')).toHaveLength(4)
    expect(screen.getByText('participant')).toBeInTheDocument()
    expect(screen.getByText('claudia')).toBeInTheDocument()
  })

  it('efface une session expirée sur le 401 du profil', async () => {
    storeSession('expired-token')
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expectSession(null)
  })

  it.each([
    {
      name: 'un 400',
      response: () => apiError(400, 'VALIDATION_ERROR', 'Vérifiez les données saisies.'),
      message: 'Vérifiez les données saisies.',
    },
    {
      name: 'un 401',
      response: () => apiError(401, 'UNAUTHENTICATED', 'Identifiants invalides.'),
      message: 'Email ou mot de passe incorrect.',
    },
    ...failures,
  ])('affiche le message de connexion attendu après $name', async ({ response, message }) => {
    server.use(http.post(loginURL, response))
    const { user } = renderAt('/login')
    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(window.location.pathname).toBe('/login')
    expectSession(null)
  })

  it.each(failures)('conserve la session du profil après $name', async ({ response, message }) => {
    server.use(http.get(profileURL, response))
    storeSession()
    renderAt('/profile')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(window.location.pathname).toBe('/profile')
    expectSession(token)
  })
})
