import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api.js'
import { AuthContext } from '../auth/AuthContext.jsx'
import Resumes from './Resumes.jsx'

vi.mock('../api/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

describe('Resumes', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  it('renders resumes returned by the API', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          user_id: 1,
          title: 'Backend Resume',
          file_url: 'stored.pdf',
          uploaded_at: '2026-08-16T10:00:00Z',
        },
      ],
    })

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ logout: vi.fn() }}>
          <Resumes />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Backend Resume' }),
    ).toBeVisible()
    expect(api.get).toHaveBeenCalledWith('/resumes')
  })
})
