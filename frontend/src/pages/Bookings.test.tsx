import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { createBookingHandlers, demoBookings } from '../mocks/bookings'

const base = import.meta.env.VITE_API_URL
const server = setupServer()
const showModal = HTMLDialogElement.prototype.showModal
const close = HTMLDialogElement.prototype.close

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  server.listen({ onUnhandledFrame: 'error' })
})
afterAll(() => {
  server.close()
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
})
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'booking-test-token')
  server.resetHandlers(...createBookingHandlers(base))
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })

function openBookings() {
  window.history.replaceState({}, '', '/me/bookings')
  return { user: userEvent.setup(), ...render(<App />) }
}

describe('Mes réservations', () => {
  it('affiche le chargement, les réservations triées et leur statut avec le jeton', async () => {
    let authorization: string | null = null
    server.use(http.get(`${base}/me/bookings`, async ({ request }) => {
      authorization = request.headers.get('Authorization')
      await delay(80)
      return HttpResponse.json([...demoBookings].reverse())
    }))
    openBookings()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
    const list = await screen.findByRole('list', { name: 'Vos réservations' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards[0]).toHaveTextContent('Rencontres créatives')
    expect(cards[0]).toHaveTextContent('2 places')
    expect(cards[1]).toHaveTextContent('Annulée')
    expect(within(cards[1]).queryByRole('button')).not.toBeInTheDocument()
    expect(authorization).toBe('Bearer booking-test-token')
  })

  it('redirige sans jeton avant toute requête', async () => {
    localStorage.removeItem('token')
    const requested = vi.fn()
    server.use(http.get(`${base}/me/bookings`, () => { requested(); return HttpResponse.json([]) }))
    openBookings()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(requested).not.toHaveBeenCalled()
  })

  it('affiche un état vide avec un accès au catalogue', async () => {
    server.use(...createBookingHandlers(base, []))
    openBookings()
    expect(await screen.findByRole('heading', { name: 'Votre agenda commence ici' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir les événements' })).toHaveAttribute('href', '/')
  })

  it('permet de réessayer après une erreur réseau sans perdre la session', async () => {
    server.use(http.get(`${base}/me/bookings`, () => HttpResponse.error()))
    const { user } = openBookings()
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur')
    expect(localStorage.getItem('token')).toBe('booking-test-token')
    server.resetHandlers(...createBookingHandlers(base))
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { name: 'Rencontres créatives' })).toBeInTheDocument()
  })

  it('nettoie une session rejetée par le serveur', async () => {
    localStorage.setItem('role', 'participant')
    localStorage.setItem('email', 'test@example.test')
    server.use(http.get(`${base}/me/bookings`, () => new HttpResponse(null, { status: 401 })))
    openBookings()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    for (const key of ['token', 'role', 'email']) expect(localStorage.getItem(key)).toBeNull()
  })

  it('permet de conserver une réservation sans appel d’annulation', async () => {
    const requested = vi.fn()
    server.use(http.patch(`${base}/bookings/:id/cancel`, () => { requested(); return HttpResponse.json({}) }))
    const { user } = openBookings()
    await user.click(await screen.findByRole('button', { name: 'Annuler la réservation pour Rencontres créatives' }))
    await user.click(screen.getByRole('button', { name: 'Conserver ma réservation' }))
    expect(requested).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
  })

  it('confirme une seule annulation puis affiche le statut annulé', async () => {
    let calls = 0
    server.use(http.patch(`${base}/bookings/:id/cancel`, async ({ request }) => {
      calls++
      expect(request.headers.get('Authorization')).toBe('Bearer booking-test-token')
      expect(await request.text()).toBe('')
      await delay(100)
      return HttpResponse.json({ ...demoBookings[0], status: 'CANCELLED' })
    }))
    const { user } = openBookings()
    await user.click(await screen.findByRole('button', { name: 'Annuler la réservation pour Rencontres créatives' }))
    await user.dblClick(screen.getByRole('button', { name: 'Confirmer l’annulation' }))
    expect(await screen.findByRole('status')).toHaveTextContent('est annulée')
    expect(calls).toBe(1)
    expect(screen.queryByRole('button', { name: 'Annuler la réservation pour Rencontres créatives' })).not.toBeInTheDocument()
  })

  it.each([403, 404, 503])('conserve la réservation lorsque l’annulation échoue (%s)', async (status) => {
    server.use(http.patch(`${base}/bookings/:id/cancel`, () => HttpResponse.json({ message: 'Annulation impossible.' }, { status })))
    const { user } = openBookings()
    await user.click(await screen.findByRole('button', { name: 'Annuler la réservation pour Rencontres créatives' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Annulation impossible.')
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer l’annulation' })).toBeEnabled()
  })

  it('redirige si la session expire pendant l’annulation', async () => {
    server.use(http.patch(`${base}/bookings/:id/cancel`, () => new HttpResponse(null, { status: 401 })))
    const { user } = openBookings()
    await user.click(await screen.findByRole('button', { name: 'Annuler la réservation pour Rencontres créatives' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('change le thème et conserve le choix', async () => {
    const { user } = openBookings()
    await user.click(screen.getByRole('button', { name: 'Activer le thème sombre' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'))
    expect(localStorage.getItem('eventhub-theme')).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Activer le thème clair' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
