import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, readToken } from '../api/client'
import { getApiError } from '../api/errors'
import type { Booking, BookingInput, Event } from '../api/types'
import { clearSession } from '../auth/session'

type EventBookingFormProps = {
  event: Event
  token: string | null
  onSeatsChange: (remainingSeats: number) => void
}

export function EventBookingForm({ event, token, onSeatsChange }: EventBookingFormProps) {
  const navigate = useNavigate()
  const pending = useRef<AbortController | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantityError, setQuantityError] = useState('')
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const loginState = { bookingEventId: event.id }
  const eventPath = `/events/${encodeURIComponent(event.id)}`

  useEffect(() => () => pending.current?.abort(), [])

  async function refreshStock(signal: AbortSignal) {
    try {
      const { data } = await api.get<Event>(eventPath, { signal })
      if (!signal.aborted) onSeatsChange(data.remainingSeats)
    } catch {
      // Une erreur de lecture ne change pas le résultat de la réservation.
    }
  }

  async function reserve(submission: FormEvent<HTMLFormElement>) {
    submission.preventDefault()
    if (!token || pending.current) return

    const quantity = Number(new FormData(submission.currentTarget).get('quantity'))
    setError('')
    setQuantityError('')
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > event.remainingSeats) {
      setQuantityError(`Saisissez un nombre entier entre 1 et ${event.remainingSeats}.`)
      return
    }

    const payload: BookingInput = { quantity }
    const controller = new AbortController()
    const { signal } = controller
    pending.current = controller
    setIsSubmitting(true)
    try {
      const { data } = await api.post<Booking>(`${eventPath}/bookings`, payload, { signal })
      if (signal.aborted) return
      setBooking(data)
      onSeatsChange(Math.max(0, event.remainingSeats - data.quantity))
      await refreshStock(signal)
    } catch (failure) {
      if (signal.aborted) return
      const { status, message, fieldErrors } = getApiError(failure)
      if (status === 401 && readToken() === token) {
        clearSession()
        navigate('/login', { replace: true, state: loginState })
      } else if (fieldErrors.quantity) {
        setQuantityError(fieldErrors.quantity)
      } else {
        setError(status === 404 ? 'La réservation est indisponible pour cet événement.' : message)
        if (status === 409) await refreshStock(signal)
      }
    } finally {
      pending.current = null
      if (!signal.aborted) setIsSubmitting(false)
    }
  }

  if (!booking && !error && event.remainingSeats === 0) return null

  return (
    <section className="state-panel event-booking" aria-labelledby="event-booking-title">
      <h2 id="event-booking-title">Réserver des places</h2>
      {booking ? (
        <>
          <p role="status" className="success-notice">
            Réservation confirmée pour {booking.quantity}{' '}
            {booking.quantity === 1 ? 'place' : 'places'}.
          </p>
          <Link to="/me/bookings">Voir mes réservations</Link>
        </>
      ) : (
        <>
          {error && <p role="alert">{error}</p>}
          {event.remainingSeats > 0 &&
            (token ? (
              <form className="auth-form" onSubmit={reserve} noValidate>
                <div>
                  <label htmlFor="booking-quantity">Nombre de places</label>
                  <input
                    id="booking-quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    max={event.remainingSeats}
                    step={1}
                    defaultValue={1}
                    required
                    disabled={isSubmitting}
                    aria-invalid={quantityError ? true : undefined}
                    aria-describedby={quantityError ? 'booking-quantity-error' : undefined}
                  />
                  {quantityError && (
                    <p id="booking-quantity-error" role="alert">
                      {quantityError}
                    </p>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Réservation…' : 'Réserver'}
                </button>
              </form>
            ) : (
              <Link className="button-link" to="/login" state={loginState}>
                Se connecter pour réserver
              </Link>
            ))}
        </>
      )}
    </section>
  )
}
