import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true') {
    const { network } = await import('virtual:msw')
    const { createAuthHandlers } = await import('./mocks/auth')
    network.configure({
      handlers: createAuthHandlers(import.meta.env.VITE_API_URL!.trim()),
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
