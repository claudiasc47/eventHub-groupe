import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession, useSessionRole, useSessionToken } from '../auth/session'
import { ThemeButton } from './ThemeButton'

export function Layout() {
  const token = useSessionToken()
  const role = useSessionRole()
  const navigate = useNavigate()

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="site-header">
        <strong>EventHub</strong>
        <nav>
          <NavLink to="/" end>
            Catalogue
          </NavLink>
          {token && role === 'organizer' && (
            <>
              <NavLink to="/me/events">Mes événements</NavLink>
              <NavLink to="/events/new">Créer un événement</NavLink>
            </>
          )}
          {token && role === 'admin' && <NavLink to="/admin/users">Utilisateurs</NavLink>}
          {token ? (
            <>
              <NavLink to="/me/bookings">Mes réservations</NavLink>
              <NavLink to="/profile">Profil</NavLink>
              <button type="button" onClick={logout}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Connexion</NavLink>
              <NavLink to="/register">Inscription</NavLink>
            </>
          )}
        </nav>
        <ThemeButton />
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </>
  )
}
