import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { user } = useAuth()
  const lokasi = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ dari: lokasi.pathname + lokasi.search }}
      />
    )
  }

  return <Outlet />
}

export function AdminRoute() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
