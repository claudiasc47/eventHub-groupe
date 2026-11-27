import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createCatalogHandlers } from './mocks/catalog'
import { createEventHandlers } from './mocks/events'

const base = import.meta.env.VITE_API_URL!
const server = setupServer(...createCatalogHandlers(base), ...createEventHandlers(base))

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('affiche la navigation et la page demandée', () => {
    renderAt('/')

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeInTheDocument()
  })

  it('mène au calendrier depuis la navigation', async () => {
    renderAt('/')

    await userEvent.click(screen.getByRole('link', { name: 'Calendrier' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendrier' })).toHaveAttribute('aria-current', 'page')
  })

  it('n’affiche « Créer un événement » qu’aux organisateurs', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: 'Créer un événement' })).not.toBeInTheDocument()
  })

  it('affiche « Créer un événement » à un organisateur connecté', () => {
    localStorage.setItem('token', 'organizer-token')
    localStorage.setItem('role', 'organizer')
    renderAt('/')

    expect(screen.getByRole('link', { name: 'Créer un événement' })).toBeInTheDocument()
  })

  it('affiche la page introuvable pour une route inconnue', () => {
    renderAt('/route-inexistante')

    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument()
  })
})
