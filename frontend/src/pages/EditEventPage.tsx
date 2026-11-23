import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { api } from '../api/client'
import { getApiError } from '../api/errors'
import type { Event, EventUpdate, NamedRef, User } from '../api/types'
import { clearSession, useSessionToken } from '../auth/session'

type Form = { name: string; description: string; startDate: string; endDate: string; locationId: string; categoryId: string; capacity: string }
type Data = { event: Event; locations: NamedRef[]; categories: NamedRef[] }

function localDate(value: string) {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toForm(event: Event): Form {
  return { name: event.name, description: event.description ?? '', startDate: localDate(event.startDate), endDate: localDate(event.endDate), locationId: event.location.id, categoryId: event.category.id, capacity: String(event.capacity) }
}

export function EditEventPage() {
  const token = useSessionToken()
  const { id = '' } = useParams()
  return token ? <EditEvent key={`${token}:${id}`} id={id} /> : <Navigate to="/login" replace />
}

function EditEvent({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [access, setAccess] = useState<'forbidden' | 'missing' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const lock = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          setAccess('missing')
          return
        }
        const { data: user } = await api.get<User>('/users/me', { signal: controller.signal })
        if (controller.signal.aborted) return
        if (user.role !== 'organizer') { setAccess('forbidden'); return }
        const { data: event } = await api.get<Event>(`/events/${id}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (event.organizerId !== user.id) { setAccess('forbidden'); return }
        const [locations, categories] = await Promise.all([
          api.get<NamedRef[]>('/locations', { signal: controller.signal }),
          api.get<NamedRef[]>('/categories', { signal: controller.signal }),
        ])
        if (!controller.signal.aborted) {
          setData({ event, locations: locations.data, categories: categories.data })
          setForm(toForm(event))
        }
      } catch (failure) {
        if (controller.signal.aborted) return
        const parsed = getApiError(failure)
        if (parsed.status === 401) clearSession()
        else if (parsed.status === 403) setAccess('forbidden')
        else if (parsed.status === 404) setAccess('missing')
        else setLoadError(parsed.message)
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [id, attempt])

  useEffect(() => { if (confirming) dialog.current?.showModal() }, [confirming])

  function closeConfirmation() {
    if (lock.current) return
    dialog.current?.close()
    setConfirming(false)
  }

  function changes(): EventUpdate | null {
    if (!form || !data) return null
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Le nom est obligatoire.'
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    if (!form.startDate || !Number.isFinite(+start)) next.startDate = 'Renseignez une date de début valide.'
    if (!form.endDate || !Number.isFinite(+end)) next.endDate = 'Renseignez une date de fin valide.'
    else if (+end < +start) next.endDate = 'La fin doit être postérieure ou égale au début.'
    const capacity = Number(form.capacity)
    if (!Number.isSafeInteger(capacity) || capacity < 1) next.capacity = 'La capacité doit être un entier positif.'
    if (!form.locationId) next.locationId = 'Choisissez un lieu.'
    if (!form.categoryId) next.categoryId = 'Choisissez une catégorie.'
    setErrors(next)
    if (Object.keys(next).length) return null
    const original = toForm(data.event)
    const patch: EventUpdate = {}
    if (form.name.trim() !== original.name) patch.name = form.name.trim()
    if (form.description !== original.description) patch.description = form.description || null
    if (form.startDate !== original.startDate) patch.startDate = start.toISOString()
    if (form.endDate !== original.endDate) patch.endDate = end.toISOString()
    if (form.locationId !== original.locationId) patch.locationId = form.locationId
    if (form.categoryId !== original.categoryId) patch.categoryId = form.categoryId
    if (capacity !== data.event.capacity) patch.capacity = capacity
    return patch
  }

  async function submit(publish: boolean) {
    if (lock.current || !data) return
    setError('')
    setNotice('')
    const patch = changes()
    if (!patch) return
    if (!publish && !Object.keys(patch).length) { setNotice('Aucune modification à enregistrer.'); return }
    lock.current = true
    setPending(true)
    try {
      const { data: updated } = await api.patch<Event>(`/events/${id}`, publish ? { ...patch, status: 'PUBLISHED' } : patch)
      if (!mounted.current) return
      setData((current) => current ? { ...current, event: updated } : null)
      setForm(toForm(updated))
      setNotice(publish ? 'Votre événement est publié.' : 'Vos modifications sont enregistrées.')
      dialog.current?.close()
      setConfirming(false)
    } catch (failure) {
      if (!mounted.current) return
      const parsed = getApiError(failure)
      if (parsed.status === 401) clearSession()
      else {
        setErrors(parsed.fieldErrors)
        setError(parsed.code === 'CAPACITY_BELOW_RESERVED' ? 'La capacité ne peut pas être inférieure au nombre de places déjà réservées.' : parsed.message)
        dialog.current?.close()
        setConfirming(false)
      }
    } finally {
      lock.current = false
      if (mounted.current) setPending(false)
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit(false)
  }

  return (
    <section className="edit-event-page">
      <Link to="/me/events">← Mes événements</Link>
      <h1>Modifier un événement</h1>
      {import.meta.env.DEV && import.meta.env.VITE_MOCK_ORGANIZER === 'true' && <p className="demo-notice">Mode démonstration : les modifications sont simulées et réinitialisées au rechargement.</p>}
      {loading ? <p role="status">Chargement de l’événement…</p> : access ? (
        <div className="state-panel"><h2>{access === 'missing' ? 'Événement introuvable' : 'Accès non autorisé'}</h2><p>Vous ne pouvez pas modifier cet événement.</p></div>
      ) : loadError ? (
        <div className="state-panel"><p role="alert">{loadError}</p><button onClick={() => { setLoading(true); setLoadError(''); setAttempt((value) => value + 1) }}>Réessayer</button></div>
      ) : data && form && (
        <>
          <p className="booking-badge">{data.event.status === 'DRAFT' ? 'Brouillon' : 'Publié'}</p>
          <p>Les horaires sont affichés dans votre fuseau local : {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
          {notice && <p className="success-notice" role="status">{notice}</p>}
          {error && <p role="alert">{error}</p>}
          <form className="auth-form edit-event-form" onSubmit={save} noValidate>
            <fieldset disabled={pending}>
              {([
                ['name', 'Nom', 'text'], ['startDate', 'Début', 'datetime-local'],
                ['endDate', 'Fin', 'datetime-local'], ['capacity', 'Capacité', 'number'],
              ] as const).map(([name, label, type]) => (
                <div key={name}><label htmlFor={`event-${name}`}>{label}</label>
                  <input id={`event-${name}`} type={type} required min={name === 'capacity' ? 1 : undefined} step={type === 'datetime-local' || type === 'number' ? 1 : undefined}
                    value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                    aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `${name}-error` : undefined} />
                  {errors[name] && <p role="alert" id={`${name}-error`}>{errors[name]}</p>}
                </div>
              ))}
              <div><label htmlFor="event-description">Description (facultatif)</label>
                <textarea id="event-description" rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}
                  aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? 'description-error' : undefined} />
                {errors.description && <p role="alert" id="description-error">{errors.description}</p>}
              </div>
              {([
                ['locationId', 'Lieu', data.locations, data.event.location],
                ['categoryId', 'Catégorie', data.categories, data.event.category],
              ] as const).map(([name, label, options, current]) => (
                <div key={name}><label htmlFor={`event-${name}`}>{label}</label>
                  <select id={`event-${name}`} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                    aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `${name}-error` : undefined}>
                    {!options.some((option) => option.id === current.id) && <option value={current.id}>{current.name}</option>}
                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  {errors[name] && <p role="alert" id={`${name}-error`}>{errors[name]}</p>}
                </div>
              ))}
              <div className="dialog-actions">
                <button type="submit">{pending ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
                {data.event.status === 'DRAFT' && <button type="button" className="secondary-button" onClick={() => {
                  setNotice(''); setError(''); if (changes()) setConfirming(true)
                }}>Publier l’événement</button>}
              </div>
            </fieldset>
          </form>
          {data.event.status === 'PUBLISHED' && <p>Un événement publié reste modifiable et ne peut pas revenir en brouillon.</p>}
          <dialog ref={dialog} aria-labelledby="publish-title" aria-describedby="publish-description" onCancel={(event) => { event.preventDefault(); closeConfirmation() }}>
            <h2 id="publish-title">Publier cet événement ?</h2>
            <p id="publish-description">Les modifications saisies seront enregistrées et l’événement deviendra visible dans le catalogue. Le retour en brouillon ne sera plus possible.</p>
            <div className="dialog-actions">
              <button type="button" className="secondary-button" disabled={pending} autoFocus onClick={closeConfirmation}>Continuer à modifier</button>
              <button type="button" disabled={pending} onClick={() => { void submit(true) }}>{pending ? 'Publication…' : 'Confirmer la publication'}</button>
            </div>
          </dialog>
        </>
      )}
    </section>
  )
}
