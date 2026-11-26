import { describe, expect, it } from 'vitest'
import { readBackLink, toBackState } from './backLink'

const catalogue = { to: '/', label: 'Retour au catalogue' }

describe('backLink', () => {
  it('revient au calendrier sur le mois d’origine', () => {
    expect(readBackLink(toBackState({ pathname: '/calendar', search: '?month=2030-03' }))).toEqual({
      to: '/calendar?month=2030-03',
      label: 'Retour au calendrier',
    })
  })

  it('revient au catalogue avec ses filtres', () => {
    expect(readBackLink(toBackState({ pathname: '/', search: '?q=jazz' }))).toEqual({
      to: '/?q=jazz',
      label: 'Retour au catalogue',
    })
  })

  it('revient à mes événements', () => {
    expect(readBackLink(toBackState({ pathname: '/me/events', search: '' }))).toEqual({
      to: '/me/events',
      label: 'Retour à mes événements',
    })
  })

  it('revient au catalogue sans origine connue', () => {
    expect(readBackLink(null)).toEqual(catalogue)
    expect(readBackLink({ bookingEventId: 'x' })).toEqual(catalogue)
    expect(readBackLink(toBackState({ pathname: '/login', search: '' }))).toEqual(catalogue)
    expect(readBackLink(toBackState({ pathname: 'constructor', search: '' }))).toEqual(catalogue)
    expect(readBackLink({ from: { pathname: '/', search: '//evil.example' } })).toEqual(catalogue)
  })
})
