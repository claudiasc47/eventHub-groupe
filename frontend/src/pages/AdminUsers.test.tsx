import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'
import { createAuthHandlers, demoAdmin, demoPassword, demoUser } from '../mocks/auth'

const base = import.meta.env.VITE_API_URL!
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  server.resetHandlers(...createAuthHandlers(base))
})
afterAll(() => server.close())

function renderAt(path: string) {
  window.history.replaceState({}, '', path)
  render(<App />)
  return userEvent.setup()
}

function storeAdminSession() {
  localStorage.setItem('token', 'admin-test-token')
  localStorage.setItem('role', 'admin')
}

async function login(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Mot de passe'), demoPassword)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

it('redirige les visiteurs vers la connexion sans demander la liste', async () => {
  const list = vi.fn(() => HttpResponse.json([]))
  server.use(http.get(`${base}/users`, list))
  renderAt('/admin/users')

  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  expect(list).not.toHaveBeenCalled()
})

it.each(['participant', 'organizer'])('refuse un compte %s côté interface', (role) => {
  const list = vi.fn(() => HttpResponse.json([]))
  server.use(http.get(`${base}/users`, list))
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('role', role)
  renderAt('/admin/users')

  expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Utilisateurs' })).not.toBeInTheDocument()
  expect(list).not.toHaveBeenCalled()
})

it('affiche les comptes, enregistre un rôle et l’applique à la prochaine connexion', async () => {
  const user = renderAt('/login')
  await login(user, demoAdmin.email)
  await user.click(await screen.findByRole('link', { name: 'Utilisateurs' }))
  const table = await screen.findByRole('table', { name: 'Comptes utilisateurs' })
  const row = within(table).getByRole('row', { name: /demo@example\.test/ })
  const select = within(row).getByRole('combobox')
  const save = within(row).getByRole('button', { name: /Enregistrer le rôle/ })
  expect(within(row).getByRole('cell', { name: 'Participant' })).toBeInTheDocument()
  expect(save).toBeDisabled()

  await user.selectOptions(select, 'organizer')
  await user.click(save)
  expect(await within(row).findByRole('status')).toHaveTextContent('Rôle mis à jour.')
  expect(within(row).getByRole('cell', { name: 'Organisateur' })).toBeInTheDocument()
  expect(save).toBeDisabled()

  await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))
  await login(user, demoUser.email)
  expect(await screen.findByRole('link', { name: 'Créer un événement' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Utilisateurs' })).not.toBeInTheDocument()
})

it('garde le rôle actuel et permet de réessayer si le PATCH échoue', async () => {
  storeAdminSession()
  const patch = vi.fn(async ({ request }: { request: Request }) => {
    expect(request.headers.get('Authorization')).toBe('Bearer admin-test-token')
    expect(await request.json()).toEqual({ role: 'organizer' })
    return HttpResponse.json({ message: 'Modification refusée.' }, { status: 403 })
  })
  server.use(
    http.get(`${base}/users`, () => HttpResponse.json([demoUser])),
    http.patch(`${base}/users/${demoUser.id}/role`, patch),
  )
  const user = renderAt('/admin/users')
  const row = await screen.findByRole('row', { name: /demo@example\.test/ })
  await user.selectOptions(within(row).getByRole('combobox'), 'organizer')
  const save = within(row).getByRole('button', { name: /Enregistrer le rôle/ })
  await user.click(save)

  expect(await within(row).findByRole('alert')).toHaveTextContent('Modification refusée.')
  expect(within(row).getByRole('cell', { name: 'Participant' })).toBeInTheDocument()
  expect(save).toBeEnabled()
  expect(patch).toHaveBeenCalledTimes(1)
})

it('gère le refus d’accès renvoyé par l’API même si le rôle local indique admin', async () => {
  storeAdminSession()
  server.use(http.get(`${base}/users`, () => new HttpResponse(null, { status: 403 })))
  renderAt('/admin/users')

  expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé aux administrateurs.')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('redirige vers la connexion quand le jeton est rejeté', async () => {
  storeAdminSession()
  renderAt('/admin/users')

  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  expect(localStorage.getItem('token')).toBeNull()
})

it('relance une liste en erreur et affiche l’état vide', async () => {
  storeAdminSession()
  server.use(
    http.get(`${base}/users`, () => HttpResponse.error(), { once: true }),
    http.get(`${base}/users`, () => HttpResponse.json([])),
  )
  const user = renderAt('/admin/users')

  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByText('Aucun utilisateur à afficher.')).toBeInTheDocument()
})
