import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

describe('App', () => {
  it('affiche la navigation et la page demandée', () => {
    renderAt('/events/new')

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Créer un événement' })).toBeInTheDocument()
  })

  it('affiche la page introuvable pour une route inconnue', () => {
    renderAt('/route-inexistante')

    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument()
  })
})
