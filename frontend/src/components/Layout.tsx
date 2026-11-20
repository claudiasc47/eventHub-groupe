import { NavLink, Outlet } from 'react-router'

const NAV_LINKS = [
  { to: '/', label: 'Catalogue' },
  { to: '/events/new', label: 'Créer un événement' },
  { to: '/profile', label: 'Profil' },
  { to: '/login', label: 'Connexion' },
  { to: '/register', label: 'Inscription' },
]

export function Layout() {
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
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
    </>
  )
}
