import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import type { Event } from '../api/types'
import { currentMonth, monthLabel } from '../components/calendarMonth'
import { createCatalogHandlers } from '../mocks/catalog'
import { createEventHandlers, demoCategories, demoLocations } from '../mocks/events'
import { createEventStore } from '../mocks/store'

const base = import.meta.env.VITE_API_URL!
const eventsURL = `${base}/events`
const server = setupServer()

let sequence = 0
function makeEvent(name: string, startDate: string, overrides: Partial<Event> = {}): Event {
  sequence += 1
  return {
    id: `00000000-0000-4000-9000-${String(sequence).padStart(12, '0')}`,
    name,
    description: null,
    startDate,
    endDate: startDate,
    location: demoLocations[0],
    category: demoCategories[0],
    status: 'PUBLISHED',
    capacity: 50,
    remainingSeats: 20,
    organizerId: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
    ...overrides,
  }
}

const jazz = makeEvent('Soirée jazz', '2030-03-10T12:00:00.000Z')
const quiz = makeEvent('Quiz musical', '2030-03-10T15:00:00.000Z')
const february = makeEvent('Atelier de février', '2030-02-27T12:00:00.000Z')
const april = makeEvent('Marché d’avril', '2030-04-15T12:00:00.000Z')
const draft = makeEvent('Brouillon caché', '2030-03-12T12:00:00.000Z', { status: 'DRAFT' })

let requests: URLSearchParams[] = []

function useEvents(events: Event[]) {
  const store = createEventStore(events)
  server.resetHandlers(
    http.get(eventsURL, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
    }),
    ...createCatalogHandlers(base, store),
    ...createEventHandlers(base, store),
  )
}

function openCalendar(path = '/calendar?month=2030-03') {
  window.history.replaceState({}, '', path)
  return { user: userEvent.setup(), ...render(<App />) }
}

async function settled() {
  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(/ en /)
  })
}

function dayCell(day: string): HTMLElement {
  const cell = document.querySelector(`time[datetime="${day}"]`)?.closest('td')
  if (!cell) throw new Error(`Jour absent de la grille : ${day}`)
  return cell
}

const namesOn = (day: string) =>
  within(dayCell(day))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  localStorage.clear()
  requests = []
  useEvents([jazz, quiz, february, april, draft])
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Calendrier — grille mensuelle', () => {
  it('affiche le mois demandé en semaines du lundi au dimanche', async () => {
    openCalendar()
    await settled()

    expect(screen.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeInTheDocument()
    const grid = screen.getByRole('table', { name: 'mars 2030' })
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'])
    expect(within(grid).getAllByRole('row')).toHaveLength(6)
    expect(dayCell('2030-02-25')).toHaveClass('is-outside')
    expect(dayCell('2030-03-01')).toHaveTextContent('1 mars')
    expect(dayCell('2030-03-01')).not.toHaveClass('is-outside')
  })

  it('place les événements publiés à leur date de début', async () => {
    openCalendar()
    await settled()

    expect(namesOn('2030-03-10')).toEqual([
      expect.stringContaining('Soirée jazz'),
      expect.stringContaining('Quiz musical'),
    ])
    expect(namesOn('2030-02-27')).toEqual([expect.stringContaining('Atelier de février')])
    expect(screen.queryByText(/Brouillon caché/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2 événements en mars 2030')
  })

  it('demande à l’API toute la période affichée', async () => {
    openCalendar()
    await settled()

    expect(requests[0].get('dateFrom')).toBe('2030-02-24')
    expect(requests[0].get('dateTo')).toBe('2030-04-01')
    expect(requests[0].get('pageSize')).toBe('100')
    expect(requests[0].get('sort')).toBe('startDate:asc')
  })

  it('signale un mois sans événement', async () => {
    openCalendar('/calendar?month=2030-06')
    await settled()

    expect(screen.getByRole('status')).toHaveTextContent('Aucun événement en juin 2030')
    expect(screen.getByRole('table', { name: 'juin 2030' })).toBeInTheDocument()
  })

  it('prévient quand tous les événements de la période ne sont pas affichés', async () => {
    useEvents(
      Array.from({ length: 101 }, (_, index) =>
        makeEvent(`Événement ${index}`, '2030-03-15T12:00:00.000Z'),
      ),
    )
    openCalendar()
    await settled()

    expect(
      screen.getByText('Seuls les 100 premiers événements de la période sont affichés.'),
    ).toBeInTheDocument()
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
    const { user } = openCalendar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    await settled()
    expect(namesOn('2030-03-10')).toHaveLength(2)
  })
})

describe('Calendrier — navigation', () => {
  it('passe d’un mois à l’autre et garde le mois dans l’adresse', async () => {
    const { user } = openCalendar()
    await settled()

    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(await screen.findByRole('table', { name: 'avril 2030' })).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('month')).toBe('2030-04')
    await waitFor(() => expect(namesOn('2030-04-15')).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }))
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(await screen.findByRole('table', { name: 'février 2030' })).toBeInTheDocument()
  })

  it('revient au mois courant', async () => {
    const { user } = openCalendar()
    await settled()

    await user.click(screen.getByRole('button', { name: 'Aujourd’hui' }))

    expect(window.location.search).toBe('')
    expect(await screen.findByRole('table')).toHaveAccessibleName(monthLabel(currentMonth()))
    expect(document.querySelector('[aria-current="date"]')).not.toBeNull()
  })

  it('affiche le mois courant si le mois de l’adresse est invalide', async () => {
    openCalendar('/calendar?month=2030-13')
    await settled()

    expect(screen.getByRole('table')).toHaveAccessibleName(monthLabel(currentMonth()))
  })
})

describe('Calendrier — accès au détail', () => {
  it('rend chaque événement cliquable vers sa page de détail', async () => {
    openCalendar()
    await settled()

    const link = within(dayCell('2030-03-10')).getByRole('link', {
      name: /Soirée jazz, 10 mars 2030$/,
    })
    expect(link).toHaveAttribute('href', `/events/${jazz.id}`)
    expect(link).toHaveAttribute('title', 'Soirée jazz')
    expect(within(dayCell('2030-03-10')).getAllByRole('link')).toHaveLength(2)
  })

  it('ouvre le détail d’un événement depuis le calendrier', async () => {
    const { user } = openCalendar()
    await settled()

    await user.click(screen.getByRole('link', { name: /Soirée jazz/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Soirée jazz' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/events/${jazz.id}`)
  })
})
