import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { createAuthHandlers, demoPassword, demoUser } from '../mocks/auth'
import { createBookingHandlers } from '../mocks/bookings'
import { createOrganizerHandlers, demoOrganizer, demoOrganizerEvents } from '../mocks/organizer'
import { createEventStore, type EventStore } from '../mocks/store'

const base = import.meta.env.VITE_API_URL!
const [published, draft] = demoOrganizerEvents
const path = `/events/${published.id}`
const bookingUrl = `${base}${path}/bookings`
const token = 'booking-test-token'
const server = setupServer()
let store: EventStore

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  store = createEventStore(demoOrganizerEvents)
  server.resetHandlers(
    ...createAuthHandlers(base),
    ...createOrganizerHandlers(base, demoOrganizerEvents, demoOrganizer, store),
    ...createBookingHandlers(base, [], store),
  )
})
afterAll(() => server.close())

function renderAt(location = path) {
  window.history.replaceState({}, '', location)
  render(<App />)
  return userEvent.setup()
}

it('ramène le visiteur au même événement après connexion', async () => {
  const user = renderAt()
  await user.click(await screen.findByRole('link', { name: 'Se connecter pour réserver' }))
  await user.type(screen.getByLabelText('E-mail'), demoUser.email)
  await user.type(screen.getByLabelText('Mot de passe'), demoPassword)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
  expect(await screen.findByRole('spinbutton', { name: 'Nombre de places' })).toHaveValue(1)
  expect(window.location.pathname).toBe(path)
})

it('confirme une seule réservation, actualise le stock et l’affiche dans Mes réservations', async () => {
  localStorage.setItem('token', token)
  const user = renderAt()
  const quantity = await screen.findByRole('spinbutton', { name: 'Nombre de places' })
  await user.clear(quantity)
  await user.type(quantity, '2')
  await user.dblClick(screen.getByRole('button', { name: 'Réserver' }))

  expect(await screen.findByText('Réservation confirmée pour 2 places.')).toBeInTheDocument()
  expect(screen.getByText('30 places disponibles sur 80')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Voir mes réservations' }))
  const bookings = await screen.findByRole('list', { name: 'Vos réservations' })
  expect(within(bookings).getAllByRole('listitem')).toHaveLength(1)
  expect(within(bookings).getByText('2 places')).toBeInTheDocument()
  expect(within(bookings).getByText('Confirmée')).toBeInTheDocument()
})

it.each(['0', '1.5', '33'])('refuse la quantité %s sans appel API', async (value) => {
  localStorage.setItem('token', token)
  const postBooking = vi.fn(() => new HttpResponse(null, { status: 500 }))
  server.use(http.post(bookingUrl, postBooking))
  const user = renderAt()
  const quantity = await screen.findByRole('spinbutton', { name: 'Nombre de places' })
  await user.clear(quantity)
  await user.type(quantity, value)
  await user.click(screen.getByRole('button', { name: 'Réserver' }))
  expect(quantity).toHaveAccessibleDescription('Saisissez un nombre entier entre 1 et 32.')
  expect(postBooking).not.toHaveBeenCalled()
})

it('affiche le conflit et actualise le stock quand les places ont été prises entre-temps', async () => {
  localStorage.setItem('token', token)
  const user = renderAt()
  const submit = await screen.findByRole('button', { name: 'Réserver' })
  const [event] = store.eventsFor(
    new Request(bookingUrl, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
  event.remainingSeats = 0

  await user.click(submit)
  expect(await screen.findByRole('alert')).toHaveTextContent('Il ne reste pas assez de places.')
  expect(await screen.findByText('Complet')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Réserver' })).not.toBeInTheDocument()
})

it('redirige vers la connexion si la session expire pendant la réservation', async () => {
  localStorage.setItem('token', token)
  server.use(http.post(bookingUrl, () => new HttpResponse(null, { status: 401 })))
  const user = renderAt()
  await user.click(await screen.findByRole('button', { name: 'Réserver' }))
  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  expect(localStorage.getItem('token')).toBeNull()
})

it('ne propose aucune réservation pour un brouillon', async () => {
  localStorage.setItem('token', token)
  renderAt(`/events/${draft.id}`)
  expect(await screen.findByRole('heading', { name: draft.name })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Réserver des places' })).not.toBeInTheDocument()
})
