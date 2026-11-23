import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('affiche la navigation et la page demandée', () => {
    renderAt('/')

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeInTheDocument()
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
