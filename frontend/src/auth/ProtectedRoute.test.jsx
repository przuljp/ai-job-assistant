import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AppNav from '../components/AppNav.jsx'
import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function ProtectedTestRoutes({ showNav = false }) {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/private"
            element={
              <>
                {showNav && <AppNav />}
                <p>Protected content</p>
              </>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

describe('protected authentication flow', () => {
  it('redirects an unauthenticated user to login', () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedTestRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('allows an authenticated user to access protected content', () => {
    localStorage.setItem('access_token', 'test-token')

    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedTestRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('logout clears the token and returns to login', async () => {
    const user = userEvent.setup()
    localStorage.setItem('access_token', 'test-token')

    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedTestRoutes showNav />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
