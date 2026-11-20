import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Écoute sur toutes les interfaces pour être joignable depuis le conteneur `web` (docker-compose).
  // Le port 5173 est l'origine autorisée par le CORS de l'API (CORS_ORIGIN).
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Valeur fictive : sans elle, tout test qui importe le client API échoue au chargement.
    env: {
      VITE_API_URL: 'http://localhost:3000/api',
    },
  },
})
