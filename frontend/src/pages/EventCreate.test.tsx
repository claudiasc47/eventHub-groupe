import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import type { Role } from '../api/types'
import { createEventHandlers, demoCategories, demoLocations } from '../mocks/events'

const base = import.meta.env.VITE_API_URL!
const eventsURL = `${base}/events`
const token = 'organizer-token'
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  server.resetHandlers(...createEventHandlers(base))
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function storeSession(role: Role) {
  localStorage.setItem('token', token)
  localStorage.setItem('role', role)
  localStorage.setItem('email', `${role}@example.test`)
}

function renderPage() {
  window.history.replaceState({}, '', '/events/new')
  return { user: userEvent.setup(), ...render(<App />) }
}

type User = ReturnType<typeof userEvent.setup>

async function fillForm(user: User, { start = '2026-12-15T20:00', end = '2026-12-15T23:00' } = {}) {
  await screen.findByRole('option', { name: demoLocations[0].name })
  await user.type(screen.getByLabelText(/^Nom/), 'Concert Jazz')
  fireEvent.change(screen.getByLabelText(/^Début/), { target: { value: start } })
  fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: end } })
  await user.selectOptions(screen.getByLabelText(/^Lieu/), demoLocations[0].name)
  await user.selectOptions(screen.getByLabelText(/^Catégorie/), demoCategories[0].name)
  await user.type(screen.getByLabelText(/^Capacité/), '200')
}

function submit(user: User) {
  return user.click(screen.getByRole('button', { name: 'Créer l’événement' }))
}

describe('Création d’événement — accès', () => {
  it('redirige vers la connexion sans session', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeInTheDocument()
  })

  it('refuse l’accès à un participant', async () => {
    storeSession('participant')
    renderPage()

    expect(
      await screen.findByText('Cette page est réservée aux organisateurs.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer l’événement' })).not.toBeInTheDocument()
  })
})

describe('Création d’événement — organisateur', () => {
  beforeEach(() => storeSession('organizer'))

  it('propose les lieux et les catégories de l’API', async () => {
    renderPage()

    for (const { name } of [...demoLocations, ...demoCategories]) {
      expect(await screen.findByRole('option', { name })).toBeInTheDocument()
    }
  })

  it('envoie l’événement au format du contrat et confirme le brouillon', async () => {
    const requests: { body: unknown; authorization: string | null }[] = []
    server.use(
      http.post(eventsURL, async ({ request }) => {
        requests.push({
          body: await request.json(),
          authorization: request.headers.get('Authorization'),
        })
        return HttpResponse.json(
          {
            id: '9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            name: 'Concert Jazz',
            description: null,
            startDate: '2026-12-15T19:00:00.000Z',
            endDate: '2026-12-15T22:00:00.000Z',
            location: demoLocations[0],
            category: demoCategories[0],
            status: 'DRAFT',
            capacity: 200,
            remainingSeats: 200,
            organizerId: '5b0f3c1e-8a2d-4c6e-9f10-2d3e4f5a6b7c',
          },
          { status: 201 },
        )
      }),
    )
    const { user } = renderPage()

    await fillForm(user)
    await submit(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Événement « Concert Jazz » créé en brouillon.',
    )
    expect(screen.getByRole('link', { name: 'Modifier ou publier l’événement' })).toHaveAttribute(
      'href',
      '/events/9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d/edit',
    )
    expect(requests).toEqual([
      {
        authorization: `Bearer ${token}`,
        body: {
          name: 'Concert Jazz',
          startDate: new Date('2026-12-15T20:00').toISOString(),
          endDate: new Date('2026-12-15T23:00').toISOString(),
          locationId: demoLocations[0].id,
          categoryId: demoCategories[0].id,
          capacity: 200,
        },
      },
    ])
  })

  it('refuse une fin antérieure au début sans appeler l’API', async () => {
    let calls = 0
    server.use(
      http.post(eventsURL, () => {
        calls += 1
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const { user } = renderPage()

    await fillForm(user, { start: '2026-12-15T20:00', end: '2026-12-15T18:00' })
    await submit(user)

    expect(await screen.findByText('La fin doit être après le début.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Fin/)).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
  })

  it('affiche les erreurs de validation de l’API sous les champs', async () => {
    server.use(
      http.post(eventsURL, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'Certaines données sont invalides.',
            details: [{ field: 'capacity', message: 'La capacité doit être un entier positif.' }],
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderPage()

    await fillForm(user)
    await submit(user)

    expect(await screen.findByText('La capacité doit être un entier positif.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Capacité/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('renvoie vers la connexion si la session a expiré', async () => {
    server.use(
      http.post(eventsURL, () =>
        HttpResponse.json(
          { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Session invalide ou expirée.' },
          { status: 401 },
        ),
      ),
    )
    const { user } = renderPage()

    await fillForm(user)
    await submit(user)

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('signale l’échec du chargement des lieux et catégories', async () => {
    server.use(http.get(`${base}/locations`, () => HttpResponse.error()))
    renderPage()

    expect(
      await screen.findByText('Impossible de charger les lieux et les catégories.', {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer l’événement' })).not.toBeInTheDocument()
  })
})
