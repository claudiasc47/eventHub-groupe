import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import App from '../App'
import { createOrganizerHandlers, demoOrganizer, demoOrganizerEvents } from '../mocks/organizer'

const base = import.meta.env.VITE_API_URL!
const [published, draft] = demoOrganizerEvents
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  server.resetHandlers(...createOrganizerHandlers(base))
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAt(path: string) {
  window.history.replaceState({}, '', path)
  render(<App />)
}

it('affiche le détail publié sans connexion', async () => {
  renderAt(`/events/${published.id}`)
  expect(screen.getByRole('status')).toHaveTextContent('Chargement de l’événement')
  expect(await screen.findByRole('heading', { name: published.name })).toBeInTheDocument()
  expect(screen.getByText(published.description!)).toBeInTheDocument()
  expect(screen.getByText(published.location.name)).toBeInTheDocument()
  expect(screen.getByText(published.category.name)).toBeInTheDocument()
  expect(screen.getByText('32 places disponibles sur 80')).toBeInTheDocument()
  expect(document.querySelector(`time[datetime="${published.startDate}"]`)).toBeInTheDocument()
  expect(document.querySelector(`time[datetime="${published.endDate}"]`)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute('href', '/')
})

it.each([draft.id, 'e3be1089-12ef-46d3-89ab-916db978cbb5'])(
  'affiche le même message pour un brouillon non autorisé et un événement absent (%s)',
  async (id) => {
    renderAt(`/events/${id}`)
    expect(
      await screen.findByRole('heading', { name: 'Événement introuvable' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(draft.name)).not.toBeInTheDocument()
  },
)

it('ouvre le détail du brouillon depuis « Mes événements » pour son propriétaire', async () => {
  localStorage.setItem('token', 'organizer-token')
  const user = userEvent.setup()
  renderAt('/me/events')
  await user.click(await screen.findByRole('link', { name: `Voir ${draft.name}` }))
  expect(await screen.findByRole('heading', { name: draft.name })).toBeInTheDocument()
  expect(screen.getByText('Brouillon')).toBeInTheDocument()
  expect(window.location.pathname).toBe(`/events/${draft.id}`)
})

it('affiche un événement introuvable quand le visiteur ne possède pas le brouillon', async () => {
  localStorage.setItem('token', 'participant-token')
  server.resetHandlers(
    ...createOrganizerHandlers(base, demoOrganizerEvents, {
      ...demoOrganizer,
      id: published.id,
      role: 'participant',
    }),
  )
  renderAt(`/events/${draft.id}`)
  expect(await screen.findByRole('heading', { name: 'Événement introuvable' })).toBeInTheDocument()
  expect(screen.queryByText(draft.name)).not.toBeInTheDocument()
})

it('permet de relancer le chargement et indique quand l’événement est complet', async () => {
  const user = userEvent.setup()
  server.use(
    http.get(`${base}/events/${published.id}`, () => new HttpResponse(null, { status: 503 })),
  )
  renderAt(`/events/${published.id}`)
  expect(await screen.findByRole('alert')).toBeInTheDocument()

  server.use(
    http.get(`${base}/events/${published.id}`, () =>
      HttpResponse.json({ ...published, remainingSeats: 0 }),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('heading', { name: published.name })).toBeInTheDocument()
  expect(screen.getByText('Complet')).toBeInTheDocument()
})
