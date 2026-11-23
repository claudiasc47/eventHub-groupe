import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Role } from '../api/types'
import { useSessionRole, useSessionToken } from './session'

const ROLE_LABELS: Record<Role, string> = {
  participant: 'aux participants',
  organizer: 'aux organisateurs',
  admin: 'aux administrateurs',
}

type RequireRoleProps = {
  role: Role
  children: ReactNode
}

// Protège une route : sans session, renvoie vers la connexion ; avec un autre rôle, explique le refus.
export function RequireRole({ role, children }: RequireRoleProps) {
  const token = useSessionToken()
  const sessionRole = useSessionRole()

  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (sessionRole !== role) {
    return (
      <section>
        <h1>Accès refusé</h1>
        <p role="alert">Cette page est réservée {ROLE_LABELS[role]}.</p>
      </section>
    )
  }
  return children
}
