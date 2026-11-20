import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
})
