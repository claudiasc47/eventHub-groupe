import { useSearchParams } from 'react-router'
import { useEventSearch, type EventSearchState } from '../api/useEventSearch'
import { CalendarGrid } from '../components/CalendarGrid'
import {
  currentMonth,
  eventDay,
  groupByDay,
  monthLabel,
  monthWeeks,
  readMonth,
  shiftMonth,
  toCalendarQuery,
} from '../components/calendarMonth'

const TITLE_ID = 'calendar-month'

export function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const month = readMonth(params)
  const weeks = monthWeeks(month)
  const { state, isUpdating, retry } = useEventSearch(toCalendarQuery(weeks))
  const label = monthLabel(month)

  const showMonth = (next: string) =>
    setParams(
      next === currentMonth() ? new URLSearchParams() : new URLSearchParams({ month: next }),
    )

  return (
    <section className="calendar-page">
      <header className="bookings-hero">
        <div>
          <p className="eyebrow">Événements</p>
          <h1>Calendrier</h1>
          <p>Les événements publiés, placés à leur date de début.</p>
        </div>
      </header>
      <div className="calendar-toolbar">
        <h2 id={TITLE_ID}>{label}</h2>
        <nav aria-label="Changer de mois">
          <button
            type="button"
            className="secondary-button"
            onClick={() => showMonth(shiftMonth(month, -1))}
          >
            Mois précédent
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => showMonth(currentMonth())}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => showMonth(shiftMonth(month, 1))}
          >
            Mois suivant
          </button>
        </nav>
      </div>
      {state.status === 'error' ? (
        <div className="state-panel">
          <p role="alert">{state.message}</p>
          <button type="button" onClick={retry}>
            Réessayer
          </button>
        </div>
      ) : (
        <div
          className="calendar-results"
          aria-busy={state.status === 'loading' || isUpdating || undefined}
        >
          <CalendarSummary state={state} isUpdating={isUpdating} month={month} label={label} />
          <CalendarGrid
            month={month}
            weeks={weeks}
            eventsByDay={groupByDay(state.status === 'ready' ? state.result.items : [])}
            labelledBy={TITLE_ID}
          />
        </div>
      )}
    </section>
  )
}

type CalendarSummaryProps = {
  state: EventSearchState
  isUpdating: boolean
  month: string
  label: string
}

function CalendarSummary({ state, isUpdating, month, label }: CalendarSummaryProps) {
  if (state.status !== 'ready') return <p role="status">Chargement des événements…</p>
  if (isUpdating) return <p role="status">Mise à jour du calendrier…</p>

  const { items, total } = state.result
  const count = items.filter((event) => eventDay(event).startsWith(month)).length
  return (
    <>
      <p role="status">
        {count === 0
          ? `Aucun événement en ${label}`
          : `${count} ${count > 1 ? 'événements' : 'événement'} en ${label}`}
      </p>
      {total > items.length && (
        <p className="demo-notice">
          Seuls les {items.length} premiers événements de la période sont affichés.
        </p>
      )}
    </>
  )
}
