import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Booking } from '../api/types'
import { clearSession, useSessionToken } from '../auth/session'

const venueImages = import.meta.glob('../assets/eventhub-venue.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const venueImage = Object.values(venueImages)[0]
const dates = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

export function BookingsPage() {
  const token = useSessionToken()
  return token ? <Bookings key={token} /> : <Navigate to="/login" replace />
}

function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [pending, setPending] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [notice, setNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelLock = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api.get<Booking[]>('/me/bookings', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setBookings([...data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
        }
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        const parsed = getApiError(failure)
        if (parsed.status === 401) clearSession()
        else setError(parsed.message)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (selected) dialog.current?.showModal()
  }, [selected])

  function closeDialog() {
    if (cancelLock.current) return
    dialog.current?.close()
    setSelected(null)
    setCancelError('')
  }

  async function cancelBooking() {
    if (!selected || cancelLock.current) return
    cancelLock.current = true
    setPending(true)
    setCancelError('')
    try {
      const { data } = await api.patch<Booking>(`/bookings/${selected.id}/cancel`)
      if (!mounted.current) return
      setBookings((current) => current.map((booking) => booking.id === data.id ? data : booking))
      setNotice(`La réservation pour « ${selected.event.name} » est annulée.`)
      dialog.current?.close()
      setSelected(null)
    } catch (failure) {
      if (!mounted.current) return
      const parsed = getApiError(failure)
      if (parsed.status === 401) clearSession()
      else setCancelError(parsed.message)
    } finally {
      cancelLock.current = false
      if (mounted.current) setPending(false)
    }
  }

  return (
    <section className="bookings-page">
      <header className="bookings-hero">
        <div>
          <p className="eyebrow">Votre prochain rendez-vous</p>
          <h1>Mes réservations</h1>
          <p>Retrouvez vos événements et gérez vos places en toute simplicité.</p>
          <Link className="button-link" to="/">Explorer le catalogue</Link>
        </div>
        {venueImage && <img src={venueImage} alt="" width="1672" height="941" decoding="async" />}
      </header>
      {import.meta.env.DEV && import.meta.env.VITE_MOCK_BOOKINGS === 'true' && (
        <p className="demo-notice">Mode démonstration : ces réservations sont simulées.</p>
      )}
      {notice && <p role="status" className="success-notice">{notice}</p>}
      {loading ? <p role="status">Chargement des réservations…</p> : error ? (
        <div className="state-panel"><p role="alert">{error}</p>
          <button onClick={() => {
            setLoading(true)
            setError('')
            setAttempt((value) => value + 1)
          }}>Réessayer</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="state-panel"><h2>Votre agenda commence ici</h2>
          <p>Vous n’avez pas encore de réservation. Découvrez les événements du catalogue.</p>
          <Link to="/">Voir les événements</Link>
        </div>
      ) : (
        <ul className="booking-list" aria-label="Vos réservations">
          {bookings.map((booking) => (
            <li key={booking.id} className="booking-card">
              <div className="booking-card-heading">
                <span className={`booking-badge ${booking.status === 'CANCELLED' ? 'cancelled' : ''}`}>
                  {booking.status === 'CONFIRMED' ? 'Confirmée' : 'Annulée'}
                </span>
                <span>{booking.quantity} {booking.quantity > 1 ? 'places' : 'place'}</span>
              </div>
              <h2>{booking.event.name}</h2>
              <p><time dateTime={booking.event.startDate}>{dates.format(new Date(booking.event.startDate))}</time></p>
              <p>Jusqu’au <time dateTime={booking.event.endDate}>{dates.format(new Date(booking.event.endDate))}</time></p>
              <p>{booking.event.location.name}</p>
              <p className="booking-created">Réservée le {dates.format(new Date(booking.createdAt))}</p>
              {booking.status === 'CONFIRMED' && (
                <button className="secondary-button" onClick={() => {
                  setCancelError('')
                  setSelected(booking)
                }} aria-label={`Annuler la réservation pour ${booking.event.name}`}>Annuler la réservation</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <dialog ref={dialog} aria-labelledby="cancel-title" aria-describedby="cancel-description"
        onCancel={(event) => { event.preventDefault(); closeDialog() }}>
        <h2 id="cancel-title">Annuler cette réservation ?</h2>
        <p id="cancel-description">{selected?.event.name} : les places réservées seront libérées. Cette action est définitive.</p>
        {cancelError && <p role="alert">{cancelError}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" autoFocus disabled={pending} onClick={closeDialog}>Conserver ma réservation</button>
          <button disabled={pending} onClick={() => { void cancelBooking() }}>
            {pending ? 'Annulation…' : 'Confirmer l’annulation'}
          </button>
        </div>
      </dialog>
    </section>
  )
}
