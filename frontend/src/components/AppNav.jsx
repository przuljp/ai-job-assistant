import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'

function AppNav() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav aria-label="Main navigation">
      <NavLink to="/dashboard">Dashboard</NavLink>{' '}
      <NavLink to="/applications">Applications</NavLink>{' '}
      <NavLink to="/resumes">Resumes</NavLink>{' '}
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  )
}

export default AppNav
