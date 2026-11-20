import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PlaceholderPage title="Catalogue" ticket="#43" />} />
          <Route path="register" element={<PlaceholderPage title="Inscription" ticket="#38" />} />
          <Route path="login" element={<PlaceholderPage title="Connexion" ticket="#38" />} />
          <Route path="profile" element={<PlaceholderPage title="Profil" ticket="#38" />} />
          <Route
            path="events/new"
            element={<PlaceholderPage title="Créer un événement" ticket="#38" />}
          />
          <Route path="*" element={<PlaceholderPage title="Page introuvable" ticket="—" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
