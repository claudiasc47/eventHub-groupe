import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './design.css'
import App from './App.tsx'

async function start() {
  const env = import.meta.env
  const mocks = {
    auth: env.VITE_MOCK_AUTH === 'true',
    bookings: env.VITE_MOCK_BOOKINGS === 'true',
    organizer: env.VITE_MOCK_ORGANIZER === 'true',
    events: env.VITE_MOCK_EVENTS === 'true',
  }

  if (env.DEV && Object.values(mocks).some(Boolean)) {
    const { network } = await import('virtual:msw')
    const { createAuthHandlers } = await import('./mocks/auth')
    const { createBookingHandlers } = await import('./mocks/bookings')
    const { createOrganizerHandlers, demoOrganizer, demoOrganizerEvents } =
      await import('./mocks/organizer')
    const { createEventHandlers } = await import('./mocks/events')
    const { createEventStore } = await import('./mocks/store')
    const baseURL = env.VITE_API_URL!.trim()
    const store = createEventStore(demoOrganizerEvents)
    network.configure({
      handlers: [
        ...(mocks.organizer
          ? createOrganizerHandlers(baseURL, demoOrganizerEvents, demoOrganizer, store)
          : []),
        ...(mocks.auth ? createAuthHandlers(baseURL) : []),
        ...(mocks.bookings ? createBookingHandlers(baseURL) : []),
        ...(mocks.events ? createEventHandlers(baseURL, store) : []),
      ],
      onUnhandledFrame: 'bypass',
    })
    await network.enable()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
