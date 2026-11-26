import type { Event } from '../api/types'
import type { EventSearchQuery } from '../api/useEventSearch'
import { toDateOnly } from './dateOnly'

export const CALENDAR_PAGE_SIZE = 100

const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/
const DAYS_PER_WEEK = 7
const monthNames = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function firstDayOf(month: string): Date {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00`)
  return toDateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount))
}

export function currentMonth(): string {
  return toDateOnly(new Date()).slice(0, 7)
}

export function readMonth(params: URLSearchParams): string {
  const month = params.get('month') ?? ''
  return MONTH_PATTERN.test(month) ? month : currentMonth()
}

export function shiftMonth(month: string, amount: number): string {
  const first = firstDayOf(month)
  return toDateOnly(new Date(first.getFullYear(), first.getMonth() + amount, 1)).slice(0, 7)
}

export function monthLabel(month: string): string {
  return monthNames.format(firstDayOf(month))
}

export function monthWeeks(month: string): string[][] {
  const first = firstDayOf(month)
  const leadingDays = (first.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const start = addDays(toDateOnly(first), -leadingDays)
  const weeks = Math.ceil((leadingDays + daysInMonth) / DAYS_PER_WEEK)
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: DAYS_PER_WEEK }, (_, day) => addDays(start, week * DAYS_PER_WEEK + day)),
  )
}

// Un jour de marge : l'API filtre en UTC, la grille est en heure locale.
export function toCalendarQuery(weeks: string[][]): EventSearchQuery {
  return {
    dateFrom: addDays(weeks[0][0], -1),
    dateTo: addDays(weeks[weeks.length - 1][DAYS_PER_WEEK - 1], 1),
    sort: 'startDate:asc',
    page: 1,
    pageSize: CALENDAR_PAGE_SIZE,
  }
}

export function eventDay(event: Event): string {
  return toDateOnly(new Date(event.startDate))
}

export function groupByDay(events: Event[]): Map<string, Event[]> {
  const days = new Map<string, Event[]>()
  for (const event of events) {
    const day = eventDay(event)
    days.set(day, [...(days.get(day) ?? []), event])
  }
  return days
}
