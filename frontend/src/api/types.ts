// Alias lisibles des schémas du contrat. `schema.d.ts` est généré par `npm run gen:api`
// depuis documentation/openapi.yaml : ne pas le modifier à la main.
import type { components } from './schema'

type Schemas = components['schemas']

export type Role = Schemas['Role']
export type User = Schemas['User']
export type RegisterInput = Schemas['RegisterInput']
export type LoginInput = Schemas['LoginInput']
export type LoginResponse = Schemas['LoginResponse']

export type NamedRef = Schemas['NamedRef']
export type EventStatus = Schemas['EventStatus']
export type Event = Schemas['Event']
export type EventInput = Schemas['EventInput']
export type EventUpdate = Schemas['EventUpdate']
export type EventSummary = Schemas['EventSummary']
export type EventPage = Schemas['EventPage']

export type BookingStatus = Schemas['BookingStatus']
export type Booking = Schemas['Booking']
export type BookingInput = Schemas['BookingInput']

export type ApiErrorCode = Schemas['ErrorCode']
export type ApiError = Schemas['Error']
export type FieldError = Schemas['FieldError']
