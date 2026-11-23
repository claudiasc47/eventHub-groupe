/// <reference types="vite/client" />
/// <reference types="msw/vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_MOCK_AUTH?: string
  readonly VITE_MOCK_BOOKINGS?: string
  readonly VITE_MOCK_ORGANIZER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
