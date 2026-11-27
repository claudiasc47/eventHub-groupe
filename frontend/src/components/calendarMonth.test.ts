import { describe, expect, it } from 'vitest'
import { currentMonth, monthWeeks, readMonth, shiftMonth, toCalendarQuery } from './calendarMonth'

const read = (month: string) => readMonth(new URLSearchParams({ month }))

describe('calendarMonth', () => {
  it('commence la grille un lundi et la termine un dimanche', () => {
    const weeks = monthWeeks('2030-03')

    expect(weeks).toHaveLength(5)
    expect(weeks[0][0]).toBe('2030-02-25')
    expect(weeks[0][4]).toBe('2030-03-01')
    expect(weeks[4][6]).toBe('2030-03-31')
  })

  it('n’ajoute pas de jour superflu quand le mois tombe juste', () => {
    const weeks = monthWeeks('2027-02')

    expect(weeks).toHaveLength(4)
    expect(weeks[0][0]).toBe('2027-02-01')
    expect(weeks[3][6]).toBe('2027-02-28')
  })

  it('va jusqu’à six semaines', () => {
    const weeks = monthWeeks('2030-09')

    expect(weeks).toHaveLength(6)
    expect(weeks[5][0]).toBe('2030-09-30')
  })

  it('change d’année en passant de décembre à janvier', () => {
    expect(shiftMonth('2030-12', 1)).toBe('2031-01')
    expect(shiftMonth('2030-01', -1)).toBe('2029-12')
  })

  it('revient au mois courant si le mois de l’adresse est invalide', () => {
    expect(read('2030-03')).toBe('2030-03')
    expect(read('2030-13')).toBe(currentMonth())
    expect(read('mars')).toBe(currentMonth())
    expect(read('0099-01')).toBe(currentMonth())
    expect(readMonth(new URLSearchParams())).toBe(currentMonth())
  })

  it('demande toute la grille avec un jour de marge', () => {
    expect(toCalendarQuery(monthWeeks('2030-03'))).toEqual({
      dateFrom: '2030-02-24',
      dateTo: '2030-04-01',
      sort: 'startDate:asc',
      page: 1,
      pageSize: 100,
    })
  })
})
