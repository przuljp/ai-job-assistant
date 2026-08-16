import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api.js'
import { AuthProvider } from '../auth/AuthContext.jsx'
import Login from './Login.jsx'

vi.mock('../api/api.js', () => ({
  AUTH_UNAUTHORIZED_EVENT: 'auth:unauthorized',
  default: { post: vi.fn() },
}))

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  it('stores the returned token and navigates after a successful login', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValueOnce({ data: { access_token: 'jwt-token' } })
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(api.post).toHaveBeenCalledWith('/users/login', {
      email: 'user@example.com',
      password: 'secret123',
    })
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(localStorage.getItem('access_token')).toBe('jwt-token')
  })

  it('shows a useful message when credentials are rejected', async () => {
    const user = userEvent.setup()
    api.post.mockRejectedValueOnce({ response: { status: 401 } })
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    )
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
