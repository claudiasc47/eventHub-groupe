import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import type { Event } from '../api/types'
import { createCatalogHandlers } from '../mocks/catalog'
import { createEventHandlers, demoCategories, demoLocations } from '../mocks/events'
import { createEventStore } from '../mocks/store'

const base = import.meta.env.VITE_API_URL!
const eventsURL = `${base}/events`
const server = setupServer()

const [paris, lyon] = demoLocations
const [meetups, workshops] = demoCategories

let sequence = 0
function makeEvent(name: string, startDate: string, overrides: Partial<Event> = {}): Event {
  sequence += 1
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    name,
    description: null,
    startDate,
    endDate: startDate,
    location: paris,
    category: meetups,
    status: 'PUBLISHED',
    capacity: 50,
    remainingSeats: 20,
    organizerId: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
    ...overrides,
  }
}

const jazz = makeEvent('Soirée jazz', '2030-03-10T19:00:00.000Z', {
  description: 'Concert de jazz manouche',
  location: lyon,
})
const workshop = makeEvent('Atelier céramique', '2030-04-02T14:00:00.000Z', {
  category: workshops,
  remainingSeats: 0,
})
const past = makeEvent('Conférence passée', '2020-01-15T18:00:00.000Z')
const draft = makeEvent('Brouillon caché', '2030-05-01T18:00:00.000Z', { status: 'DRAFT' })

let requests: URLSearchParams[] = []

function useCatalog(events: Event[]) {
  const store = createEventStore(events)
  server.resetHandlers(
    http.get(eventsURL, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
    }),
    ...createCatalogHandlers(base, store),
    ...createEventHandlers(base, store),
  )
}

function toObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function today(): string {
  const now = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function openCatalog(path = '/') {
  window.history.replaceState({}, '', path)
  return { user: userEvent.setup(), ...render(<App />) }
}

async function settled() {
  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(/trouvés?$/)
  })
}

async function results() {
  await settled()
  return within(screen.getByRole('list', { name: 'Événements' })).getAllByRole('heading', {
    level: 2,
  })
}

const titles = async () => (await results()).map((heading) => heading.textContent)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  requests = []
  useCatalog([jazz, workshop, past, draft])
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Catalogue — affichage', () => {
  it('affiche sans connexion les événements publiés à venir', async () => {
    openCatalog()

    expect((await results()).map((heading) => heading.textContent)).toEqual([
      'Soirée jazz',
      'Atelier céramique',
    ])
    expect(screen.getByText('2 événements trouvés')).toBeInTheDocument()
    expect(requests[0].get('dateFrom')).toBe(today())
    expect(requests[0].get('page')).toBe('1')
    expect(requests[0].has('q')).toBe(false)
  })

  it('présente chaque événement avec ses informations et un lien vers son détail', async () => {
    openCatalog()

    const card = (await screen.findByRole('heading', { name: 'Soirée jazz' })).closest('li')!
    expect(card).toHaveTextContent('Concert de jazz manouche')
    expect(card).toHaveTextContent(lyon.name)
    expect(card).toHaveTextContent('20 places disponibles sur 50')
    expect(
      within(card).getByRole('link', { name: 'Voir le détail : Soirée jazz' }),
    ).toHaveAttribute('href', `/events/${jazz.id}`)
    const full = screen.getByRole('heading', { name: 'Atelier céramique' }).closest('li')!
    expect(full).toHaveTextContent('Complet')
  })

  it('ouvre le détail d’un événement depuis sa carte', async () => {
    const { user } = openCatalog()

    await user.click(await screen.findByRole('link', { name: 'Voir le détail : Soirée jazz' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Soirée jazz' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/events/${jazz.id}`)
  })

  it('signale une erreur de chargement et permet de réessayer', async () => {
    let calls = 0
    server.use(
      http.get(eventsURL, () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json(
            { statusCode: 503, code: 'INTERNAL_ERROR', message: 'Service indisponible.' },
            { status: 503 },
          )
        }
      }),
    )
    const { user } = openCatalog()

    expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await results()).toHaveLength(2)
  })
})

describe('Catalogue — filtres', () => {
  it('envoie les filtres au format du contrat et les garde dans l’adresse', async () => {
    const { user } = openCatalog()
    await screen.findByRole('option', { name: lyon.name })

    await user.type(screen.getByLabelText('Recherche'), 'jazz')
    await user.selectOptions(screen.getByLabelText('Catégorie'), meetups.name)
    await user.selectOptions(screen.getByLabelText('Lieu'), lyon.name)
    fireEvent.change(screen.getByLabelText('À partir du'), { target: { value: '2030-03-01' } })
    fireEvent.change(screen.getByLabelText('Jusqu’au'), { target: { value: '2030-03-31' } })

    await waitFor(() => {
      expect(requests.at(-1)!.get('dateTo')).toBe('2030-03-31')
      expect(requests.at(-1)!.get('q')).toBe('jazz')
    })
    expect(await titles()).toEqual(['Soirée jazz'])
    const last = requests.at(-1)!
    expect(toObject(last)).toEqual({
      q: 'jazz',
      categoryId: meetups.id,
      locationId: lyon.id,
      dateFrom: '2030-03-01',
      dateTo: '2030-03-31',
      sort: 'startDate:asc',
      page: '1',
      pageSize: '12',
    })
    expect(new URLSearchParams(window.location.search).get('q')).toBe('jazz')
  })

  it('reprend les filtres présents dans l’adresse', async () => {
    openCatalog(`/?q=c%C3%A9ramique&categoryId=${workshops.id}`)

    expect((await results()).map((heading) => heading.textContent)).toEqual(['Atelier céramique'])
    expect(screen.getByLabelText('Recherche')).toHaveValue('céramique')
    expect(await screen.findByLabelText('Catégorie')).toHaveValue(workshops.id)
    expect(requests[0].get('q')).toBe('céramique')
  })

  it('inclut les événements passés quand la date de début est vidée', async () => {
    openCatalog()
    await results()

    fireEvent.change(screen.getByLabelText('À partir du'), { target: { value: '' } })

    expect(await screen.findByRole('heading', { name: 'Conférence passée' })).toBeInTheDocument()
    expect(requests.at(-1)!.has('dateFrom')).toBe(false)
  })

  it('trie du plus lointain au plus proche', async () => {
    const { user } = openCatalog()
    await results()

    await user.selectOptions(screen.getByLabelText('Ordre'), 'Les plus lointains')

    expect(requests.at(-1)!.get('sort')).toBe('startDate:desc')
    expect(await titles()).toEqual(['Atelier céramique', 'Soirée jazz'])
  })
})

describe('Catalogue — pagination', () => {
  it('affiche 12 événements par page et passe à la page suivante', async () => {
    useCatalog(
      Array.from({ length: 13 }, (_, index) =>
        makeEvent(
          `Événement ${index + 1}`,
          `2030-06-${String(index + 1).padStart(2, '0')}T18:00:00.000Z`,
        ),
      ),
    )
    const { user } = openCatalog()

    expect(await results()).toHaveLength(12)
    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page précédente' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Page suivante' }))

    expect((await results()).map((heading) => heading.textContent)).toEqual(['Événement 13'])
    expect(requests.at(-1)!.get('page')).toBe('2')
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument()
  })
})

describe('Catalogue — aucun résultat et mise à jour (#44)', () => {
  it('met à jour les résultats dès qu’un filtre change, sans bouton à cliquer', async () => {
    const { user } = openCatalog()
    expect(await titles()).toEqual(['Soirée jazz', 'Atelier céramique'])

    await user.selectOptions(await screen.findByLabelText('Catégorie'), workshops.name)

    expect(await titles()).toEqual(['Atelier céramique'])
    expect(requests.at(-1)!.get('categoryId')).toBe(workshops.id)
    expect(screen.queryByRole('button', { name: 'Rechercher' })).not.toBeInTheDocument()
  })

  it('attend la fin de la saisie avant de lancer la recherche texte', async () => {
    const { user } = openCatalog()
    await results()

    await user.type(screen.getByLabelText('Recherche'), 'jazz')

    await waitFor(() => expect(requests.at(-1)!.get('q')).toBe('jazz'))
    expect(await titles()).toEqual(['Soirée jazz'])
    const searched = requests.filter((params) => params.has('q')).map((params) => params.get('q'))
    expect(searched).toEqual(['jazz'])
  })

  it('garde un espace tapé avant une pause dans la recherche', async () => {
    const { user } = openCatalog()
    await results()
    const search = screen.getByLabelText('Recherche')

    await user.type(search, 'soirée ')
    await waitFor(() => expect(requests.at(-1)!.get('q')).toBe('soirée'))
    await user.type(search, 'jazz')

    expect(search).toHaveValue('soirée jazz')
    expect(await titles()).toEqual(['Soirée jazz'])
  })

  it('signale l’absence de résultat et permet de réinitialiser les filtres', async () => {
    const { user } = openCatalog('/?q=introuvable')

    expect(
      await screen.findByRole('heading', {
        name: 'Aucun événement ne correspond à votre recherche',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 événement trouvé')
    expect(screen.queryByRole('list', { name: 'Événements' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }))

    expect(await titles()).toEqual(['Soirée jazz', 'Atelier céramique'])
    expect(screen.getByLabelText('Recherche')).toHaveValue('')
    expect(window.location.search).toBe('')
  })

  it('distingue un catalogue vide d’une recherche sans résultat', async () => {
    useCatalog([past, draft])
    openCatalog()

    expect(
      await screen.findByRole('heading', { name: 'Aucun événement à venir pour le moment' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Réinitialiser les filtres' }),
    ).not.toBeInTheDocument()
  })

  it('propose de revenir à la première page quand la page demandée n’existe pas', async () => {
    const { user } = openCatalog('/?page=5')

    await user.click(await screen.findByRole('button', { name: 'Revenir à la première page' }))

    expect(await titles()).toEqual(['Soirée jazz', 'Atelier céramique'])
    expect(requests.at(-1)!.get('page')).toBe('1')
  })

  it('reprend les filtres précédents avec le bouton « Précédent » du navigateur', async () => {
    const { user } = openCatalog()
    await results()

    await user.selectOptions(await screen.findByLabelText('Lieu'), lyon.name)
    expect(await titles()).toEqual(['Soirée jazz'])

    window.history.back()

    await waitFor(() => expect(screen.getByLabelText('Lieu')).toHaveValue(''))
    expect(await titles()).toEqual(['Soirée jazz', 'Atelier céramique'])
  })
})
