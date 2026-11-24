import { BrowserRouter, Route, Routes } from 'react-router'
import { RequireRole } from './auth/RequireRole'
import { Layout } from './components/Layout'
import { CatalogPage } from './pages/CatalogPage'
import { EventCreatePage } from './pages/EventCreatePage'
import { EventDetailPage } from './pages/EventDetailPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { BookingsPage } from './pages/BookingsPage'
import { OrganizerEventsPage } from './pages/OrganizerEventsPage'
import { EditEventPage } from './pages/EditEventPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CatalogPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="me/bookings" element={<BookingsPage />} />
          <Route path="me/events" element={<OrganizerEventsPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="events/:id/edit" element={<EditEventPage />} />
          <Route
            path="events/new"
            element={
              <RequireRole role="organizer">
                <EventCreatePage />
              </RequireRole>
            }
          />
          <Route path="*" element={<PlaceholderPage title="Page introuvable" ticket="—" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
