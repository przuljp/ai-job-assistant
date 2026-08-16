import { Navigate, Outlet } from 'react-router-dom'
import useAuth from './useAuth.js'

function PublicRoute() {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default PublicRoute
