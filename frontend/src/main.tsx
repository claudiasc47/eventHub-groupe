import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './design.css'
import App from './App.tsx'

async function start() {
  if (import.meta.env.DEV && (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_MOCK_BOOKINGS === 'true')) {
    const { network } = await import('virtual:msw')
    const { createAuthHandlers } = await import('./mocks/auth')
    const { createBookingHandlers } = await import('./mocks/bookings')
    network.configure({
      handlers: [
        ...(import.meta.env.VITE_MOCK_AUTH === 'true' ? createAuthHandlers(import.meta.env.VITE_API_URL!.trim()) : []),
        ...(import.meta.env.VITE_MOCK_BOOKINGS === 'true' ? createBookingHandlers(import.meta.env.VITE_API_URL!.trim()) : []),
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
