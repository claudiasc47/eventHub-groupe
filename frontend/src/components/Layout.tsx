import { NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession, useSessionToken } from '../auth/session'

const NAV_LINKS = [
  { to: '/', label: 'Catalogue' },
  { to: '/events/new', label: 'Créer un événement' },
]

export function Layout() {
  const token = useSessionToken()
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
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
          {token ? (
            <>
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
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </>
  )
}
