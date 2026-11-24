import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay } from 'msw'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { createOrganizerHandlers, demoOrganizer, demoOrganizerEvents } from '../mocks/organizer'

const base = import.meta.env.VITE_API_URL!
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'organizer-token')
  server.resetHandlers(...createOrganizerHandlers(base))
})
afterEach(() => server.resetHandlers())

function openPage() {
  window.history.replaceState({}, '', '/me/events')
  return { user: userEvent.setup(), ...render(<App />) }
}

describe('Mes événements organisateur', () => {
  it('charge le profil puis les événements avec le jeton et les trie par date', async () => {
    const requests: string[] = []
    server.use(
      http.get(`${base}/users/me`, ({ request }) => {
        requests.push('profile')
        expect(request.headers.get('Authorization')).toBe('Bearer organizer-token')
        return HttpResponse.json(demoOrganizer)
      }),
      http.get(`${base}/me/events`, async ({ request }) => {
        requests.push('events')
        expect(request.headers.get('Authorization')).toBe('Bearer organizer-token')
        await delay(50)
        return HttpResponse.json([...demoOrganizerEvents].reverse())
      }),
    )
    openPage()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
    const list = await screen.findByRole('list', { name: 'Vos événements' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards[0]).toHaveTextContent('Rencontres créatives')
    expect(cards[0]).toHaveTextContent('Publié')
    expect(cards[0]).toHaveTextContent('32 places disponibles sur 80')
    expect(cards[1]).toHaveTextContent('Brouillon')
    expect(requests).toEqual(['profile', 'events'])
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Créer un événement' })).toHaveAttribute('href', '/events/new')
  })

  it('filtre les brouillons et les événements publiés sans nouvelle requête', async () => {
    const { user } = openPage()
    await screen.findByRole('list', { name: 'Vos événements' })
    await user.click(screen.getByRole('button', { name: 'Brouillons' }))
    expect(screen.getByRole('heading', { name: 'Atelier photographie' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Rencontres créatives' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brouillons' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Publiés' }))
    expect(screen.getByRole('heading', { name: 'Rencontres créatives' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tous' }))
    expect(within(screen.getByRole('list', { name: 'Vos événements' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('affiche un état vide lorsqu’aucun événement n’existe', async () => {
    server.use(...createOrganizerHandlers(base, []))
    openPage()
    expect(await screen.findByRole('heading', { name: 'Votre premier événement commence ici' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Créer mon premier événement' })).toHaveAttribute('href', '/events/new')
  })

  it('distingue un filtre vide d’une liste vide', async () => {
    server.use(...createOrganizerHandlers(base, [demoOrganizerEvents[0]]))
    const { user } = openPage()
    await screen.findByRole('list', { name: 'Vos événements' })
    await user.click(screen.getByRole('button', { name: 'Brouillons' }))
    expect(screen.getByRole('heading', { name: 'Aucun événement pour ce statut' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tous' }))
    expect(screen.getByRole('heading', { name: 'Rencontres créatives' })).toBeInTheDocument()
  })

  it('redirige sans session et ne fait aucun appel', async () => {
    localStorage.removeItem('token')
    const profile = vi.fn()
    server.use(http.get(`${base}/users/me`, () => { profile(); return HttpResponse.json(demoOrganizer) }))
    openPage()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(profile).not.toHaveBeenCalled()
  })

  it.each(['participant', 'admin'] as const)('refuse le rôle %s même si le stockage local indique organizer', async (role) => {
    localStorage.setItem('role', 'organizer')
    const events = vi.fn()
    server.use(...createOrganizerHandlers(base, demoOrganizerEvents, { ...demoOrganizer, role }))
    server.use(http.get(`${base}/me/events`, () => { events(); return HttpResponse.json([]) }))
    openPage()
    expect(await screen.findByRole('heading', { name: 'Accès réservé aux organisateurs' })).toBeInTheDocument()
    expect(events).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBe('organizer-token')
  })

  it.each(['users/me', 'me/events'])('efface la session sur un 401 de %s', async (path) => {
    localStorage.setItem('role', 'organizer')
    localStorage.setItem('email', demoOrganizer.email)
    server.use(http.get(`${base}/${path}`, () => new HttpResponse(null, { status: 401 })))
    openPage()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    for (const key of ['token', 'role', 'email']) expect(localStorage.getItem(key)).toBeNull()
  })

  it('respecte un refus serveur sur la liste', async () => {
    server.use(http.get(`${base}/me/events`, () => new HttpResponse(null, { status: 403 })))
    openPage()
    expect(await screen.findByRole('heading', { name: 'Accès réservé aux organisateurs' })).toBeInTheDocument()
  })

  it.each(['network', 'server'])('permet de réessayer après une erreur %s sans perdre la session', async (failure) => {
    server.use(http.get(`${base}/me/events`, () => failure === 'network' ? HttpResponse.error() : new HttpResponse(null, { status: 503 })))
    const { user } = openPage()
    await screen.findByRole('alert')
    expect(localStorage.getItem('token')).toBe('organizer-token')
    server.resetHandlers(...createOrganizerHandlers(base))
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('list', { name: 'Vos événements' })).toBeInTheDocument()
  })
})
