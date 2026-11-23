import type { ChangeEvent, ReactNode } from 'react'
import type { NamedRef } from '../api/types'
import type { EventField, EventFormErrors, EventFormValues } from './eventForm'

type EventFormFieldsProps = {
  values: EventFormValues
  errors: EventFormErrors
  onChange: (name: EventField, value: string) => void
  locations: NamedRef[]
  categories: NamedRef[]
  /** Lieu et catégorie d'un événement existant, gardés même si l'API ne les propose plus. */
  current?: { location: NamedRef; category: NamedRef }
}

type ControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Champs communs aux formulaires de création et de modification d'un événement. */
export function EventFormFields({
  values,
  errors,
  onChange,
  locations,
  categories,
  current,
}: EventFormFieldsProps) {
  const control = (name: EventField) => ({
    id: `event-${name}`,
    name,
    value: values[name],
    onChange: (event: ChangeEvent<ControlElement>) => onChange(name, event.target.value),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `event-${name}-error` : undefined,
  })
  const field = (name: EventField, label: string, input: ReactNode) => (
    <div>
      <label htmlFor={`event-${name}`}>{label}</label>
      {input}
      {errors[name] && (
        <p id={`event-${name}-error`} role="alert">
          {errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <>
      {field('name', 'Nom', <input type="text" required {...control('name')} />)}
      {field(
        'description',
        'Description (facultatif)',
        <textarea rows={4} {...control('description')} />,
      )}
      {field(
        'startDate',
        'Début',
        <input type="datetime-local" step={1} required {...control('startDate')} />,
      )}
      {field(
        'endDate',
        'Fin',
        <input type="datetime-local" step={1} required {...control('endDate')} />,
      )}
      {field(
        'locationId',
        'Lieu',
        <select required {...control('locationId')}>
          <Options items={locations} current={current?.location} />
        </select>,
      )}
      {field(
        'categoryId',
        'Catégorie',
        <select required {...control('categoryId')}>
          <Options items={categories} current={current?.category} />
        </select>,
      )}
      {field(
        'capacity',
        'Capacité',
        <input type="number" min={1} step={1} required {...control('capacity')} />,
      )}
    </>
  )
}

function Options({ items, current }: { items: NamedRef[]; current?: NamedRef }) {
  const isMissing = current && !items.some((item) => item.id === current.id)
  return (
    <>
      <option value="" disabled>
        Choisir…
      </option>
      {isMissing && <option value={current.id}>{current.name}</option>}
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </>
  )
}
