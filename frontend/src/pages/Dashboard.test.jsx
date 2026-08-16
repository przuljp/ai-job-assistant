import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api.js'
import { AuthContext } from '../auth/AuthContext.jsx'
import Dashboard from './Dashboard.jsx'

vi.mock('../api/api.js', () => ({
  AUTH_UNAUTHORIZED_EVENT: 'auth:unauthorized',
  default: { get: vi.fn() },
}))

function renderDashboard() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ logout: vi.fn() }}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  it('renders important statistics returned by the API', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        total_applications: 7,
        saved_count: 1,
        applied_count: 2,
        interview_count: 3,
        rejected_count: 1,
        accepted_count: 0,
        resume_count: 4,
        analysis_count: 5,
        latest_applications: [],
      },
    })
    renderDashboard()

    for (const [label, value] of [
      ['Total Applications', '7'],
      ['Interviews', '3'],
      ['Resumes', '4'],
      ['AI Analyses', '5'],
    ]) {
      const heading = await screen.findByRole('heading', { name: label })
      expect(within(heading.closest('article')).getByText(value)).toBeVisible()
    }

    expect(api.get).toHaveBeenCalledWith('/dashboard')
  })
})
