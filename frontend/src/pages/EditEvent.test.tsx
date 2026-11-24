import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { createOrganizerHandlers, demoOrganizer, demoOrganizerEvents } from '../mocks/organizer'

const base = import.meta.env.VITE_API_URL!
const draft = demoOrganizerEvents[1]
const published = demoOrganizerEvents[0]
const server = setupServer()
const originalShow = HTMLDialogElement.prototype.showModal
const originalClose = HTMLDialogElement.prototype.close
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  server.listen({ onUnhandledFrame: 'error' })
})
afterAll(() => {
  server.close()
  HTMLDialogElement.prototype.showModal = originalShow
  HTMLDialogElement.prototype.close = originalClose
})
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'edit-token')
  server.resetHandlers(...createOrganizerHandlers(base))
})
afterEach(() => server.resetHandlers())

function openPage(id = draft.id) {
  window.history.replaceState({}, '', `/events/${id}/edit`)
  return { user: userEvent.setup(), ...render(<App />) }
}

async function ready() { return screen.findByLabelText('Nom') }

describe('Modification et publication', () => {
  it('préremplit les données du brouillon et les référentiels', async () => {
    openPage()
    expect(await ready()).toHaveValue(draft.name)
    expect(screen.getByLabelText('Capacité')).toHaveValue(20)
    expect(screen.getByLabelText('Lieu')).toHaveValue(draft.location.id)
    expect(screen.getByLabelText('Catégorie')).toHaveValue(draft.category.id)
    expect(screen.getByLabelText('Description (facultatif)')).toHaveValue('')
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
  })

  it('envoie uniquement les champs modifiés sans identité ni statut et conserve les changements dans la liste', async () => {
    const requests: unknown[] = []
    server.use(http.patch(`${base}/events/${draft.id}`, async ({ request }) => {
      expect(request.headers.get('Authorization')).toBe('Bearer edit-token')
      const body = await request.json()
      requests.push(body)
      return HttpResponse.json({ ...draft, name: 'Mon nouvel atelier' })
    }))
    const { user } = openPage()
    const name = await ready()
    await user.clear(name)
    await user.type(name, 'Mon nouvel atelier')
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    expect(await screen.findByRole('status')).toHaveTextContent('modifications sont enregistrées')
    expect(requests).toEqual([{ name: 'Mon nouvel atelier' }])
    expect(name).toHaveValue('Mon nouvel atelier')
  })

  it('ne fait pas de PATCH sans changement', async () => {
    const patch = vi.fn()
    server.use(http.patch(`${base}/events/:id`, () => { patch(); return HttpResponse.json(draft) }))
    const { user } = openPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Aucune modification')
    expect(patch).not.toHaveBeenCalled()
  })

  it('convertit les dates locales en UTC et efface une description avec null', async () => {
    let body: unknown
    server.use(http.patch(`${base}/events/${published.id}`, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ ...published, startDate: new Date('2027-02-15T10:30:00').toISOString(), endDate: new Date('2027-02-15T12:30:00').toISOString(), description: null })
    }))
    const { user } = openPage(published.id)
    await ready()
    fireEvent.change(screen.getByLabelText('Début'), { target: { value: '2027-02-15T10:30:00' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2027-02-15T12:30:00' } })
    await user.clear(screen.getByLabelText('Description (facultatif)'))
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    await screen.findByRole('status')
    expect(body).toEqual({ startDate: new Date('2027-02-15T10:30:00').toISOString(), endDate: new Date('2027-02-15T12:30:00').toISOString(), description: null })
    expect(screen.queryByRole('button', { name: 'Publier l’événement' })).not.toBeInTheDocument()
  })

  it('refuse un nom vide, une capacité invalide et une fin avant le début', async () => {
    const patch = vi.fn()
    server.use(http.patch(`${base}/events/:id`, () => { patch(); return HttpResponse.json(draft) }))
    const { user } = openPage()
    await user.clear(await ready())
    fireEvent.change(screen.getByLabelText('Capacité'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2020-01-01T10:00:00' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    expect(screen.getByLabelText('Nom')).toHaveAccessibleDescription('Le nom est obligatoire.')
    expect(screen.getByLabelText('Capacité')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Fin')).toHaveAttribute('aria-invalid', 'true')
    expect(patch).not.toHaveBeenCalled()
  })

  it('annule la confirmation de publication sans requête', async () => {
    const patch = vi.fn()
    server.use(http.patch(`${base}/events/:id`, () => { patch(); return HttpResponse.json(draft) }))
    const { user } = openPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Publier l’événement' }))
    await user.click(screen.getByRole('button', { name: 'Continuer à modifier' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(patch).not.toHaveBeenCalled()
  })

  it('publie le brouillon, enregistre les champs saisis et actualise la liste', async () => {
    const { user } = openPage()
    const name = await ready()
    await user.clear(name)
    await user.type(name, 'Atelier publié')
    await user.click(screen.getByRole('button', { name: 'Publier l’événement' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer la publication' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Votre événement est publié.')
    expect(screen.getByText('Publié')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publier l’événement' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '← Mes événements' }))
    const list = await screen.findByRole('list', { name: 'Vos événements' })
    const card = within(list).getAllByRole('listitem').find((item) => item.textContent?.includes('Atelier publié'))!
    expect(card).toHaveTextContent('Publié')
  })

  it('affiche le conflit de capacité sans perdre les saisies', async () => {
    const { user } = openPage(published.id)
    await ready()
    fireEvent.change(screen.getByLabelText('Capacité'), { target: { value: '1' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('places déjà réservées')
    expect(screen.getByLabelText('Capacité')).toHaveValue(1)
  })

  it('associe les erreurs serveur aux champs', async () => {
    server.use(http.patch(`${base}/events/:id`, () => HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Données invalides.', details: [{ field: 'name', message: 'Nom refusé.' }] }, { status: 400 })))
    const { user } = openPage()
    fireEvent.change(await ready(), { target: { value: 'Autre nom' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    await screen.findByText('Nom refusé.')
    expect(screen.getByLabelText('Nom')).toHaveAccessibleDescription('Nom refusé.')
  })

  it.each([403, 404, 503])('conserve le formulaire après un échec de sauvegarde %s', async (status) => {
    server.use(http.patch(`${base}/events/:id`, () => HttpResponse.json({ message: 'Enregistrement impossible.' }, { status })))
    const { user } = openPage()
    fireEvent.change(await ready(), { target: { value: 'Nom conservé' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enregistrement impossible.')
    expect(screen.getByLabelText('Nom')).toHaveValue('Nom conservé')
    expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeEnabled()
  })

  it('redirige sans session', async () => {
    localStorage.removeItem('token')
    openPage()
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('refuse de modifier un événement appartenant à un autre organisateur', async () => {
    server.use(http.get(`${base}/events/:id`, () => HttpResponse.json({ ...published, organizerId: 'other-organizer' })))
    openPage(published.id)
    expect(await screen.findByRole('heading', { name: 'Accès non autorisé' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nom')).not.toBeInTheDocument()
  })

  it('refuse un participant et un identifiant invalide', async () => {
    server.use(...createOrganizerHandlers(base, demoOrganizerEvents, { ...demoOrganizer, role: 'participant' }))
    const first = openPage()
    expect(await screen.findByRole('heading', { name: 'Accès non autorisé' })).toBeInTheDocument()
    first.unmount()
    openPage('invalid')
    expect(await screen.findByRole('heading', { name: 'Événement introuvable' })).toBeInTheDocument()
  })

  it('efface une session rejetée pendant la publication', async () => {
    server.use(http.patch(`${base}/events/:id`, () => new HttpResponse(null, { status: 401 })))
    const { user } = openPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Publier l’événement' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer la publication' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
