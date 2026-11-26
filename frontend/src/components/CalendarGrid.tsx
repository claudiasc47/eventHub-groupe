import { Link } from 'react-router'
import type { Event } from '../api/types'
import { today } from './dateOnly'

const WEEKDAYS = [
  ['lun.', 'lundi'],
  ['mar.', 'mardi'],
  ['mer.', 'mercredi'],
  ['jeu.', 'jeudi'],
  ['ven.', 'vendredi'],
  ['sam.', 'samedi'],
  ['dim.', 'dimanche'],
] as const

const times = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' })
const firstDays = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const longDays = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

type CalendarGridProps = {
  month: string
  weeks: string[][]
  eventsByDay: Map<string, Event[]>
  labelledBy: string
}

export function CalendarGrid({ month, weeks, eventsByDay, labelledBy }: CalendarGridProps) {
  const currentDay = today()
  return (
    <table className="calendar-grid" aria-labelledby={labelledBy}>
      <thead>
        <tr>
          {WEEKDAYS.map(([short, full]) => (
            <th key={full} scope="col">
              <abbr title={full}>{short}</abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]}>
            {week.map((day) => (
              <td
                key={day}
                className={day.startsWith(month) ? undefined : 'is-outside'}
                aria-current={day === currentDay ? 'date' : undefined}
              >
                <time className="calendar-day" dateTime={day}>
                  {dayNumber(day)}
                </time>
                <DayEvents events={eventsByDay.get(day)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function dayNumber(day: string): string {
  const date = new Date(`${day}T00:00:00`)
  return date.getDate() === 1 ? firstDays.format(date) : String(date.getDate())
}

function DayEvents({ events }: { events: Event[] | undefined }) {
  if (!events) return null
  return (
    <ul className="calendar-events">
      {events.map((event) => {
        const start = new Date(event.startDate)
        const time = times.format(start)
        return (
          <li key={event.id}>
            <Link
              className="calendar-event"
              to={`/events/${event.id}`}
              title={event.name}
              aria-label={`${time} ${event.name}, ${longDays.format(start)}`}
            >
              <time dateTime={event.startDate}>{time}</time> {event.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
