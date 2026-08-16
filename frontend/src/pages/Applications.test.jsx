import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api.js'
import { AuthContext } from '../auth/AuthContext.jsx'
import Applications from './Applications.jsx'

vi.mock('../api/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('../components/AIAnalysisPanel.jsx', () => ({
  default: () => null,
}))

const application = {
  id: 1,
  user_id: 1,
  company: 'Acme',
  position: 'Backend Engineer',
  job_url: null,
  job_description: 'Build APIs with Python.',
  status: 'Applied',
  application_date: null,
  notes: null,
  created_at: '2026-08-16T10:00:00Z',
  updated_at: '2026-08-16T10:00:00Z',
}

function renderApplications() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ logout: vi.fn() }}>
        <Applications />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Applications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders applications returned by the API', async () => {
    api.get.mockResolvedValueOnce({ data: [application] })
    renderApplications()

    const list = (await screen.findByRole('heading', {
      name: 'Your Applications',
    })).closest('section')
    expect(within(list).getByRole('heading', { name: 'Backend Engineer' }))
      .toBeVisible()
    expect(within(list).getByText('Acme')).toBeVisible()
    expect(api.get).toHaveBeenCalledWith('/applications')
  })

  it('adds a newly created application to the list', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValueOnce({ data: [] })
    api.post.mockResolvedValueOnce({ data: application })
    renderApplications()

    await screen.findByText('No applications yet.')
    await user.type(screen.getByLabelText('Company'), 'Acme')
    await user.type(screen.getByLabelText('Position'), 'Backend Engineer')
    await user.click(
      screen.getByRole('button', { name: 'Create Application' }),
    )

    expect(api.post).toHaveBeenCalledWith('/applications', {
      company: 'Acme',
      position: 'Backend Engineer',
      job_url: null,
      job_description: null,
      status: 'Saved',
      application_date: null,
      notes: null,
    })

    const list = screen.getByRole('heading', {
      name: 'Your Applications',
    }).closest('section')
    expect(
      await within(list).findByRole('heading', { name: 'Backend Engineer' }),
    ).toBeVisible()
  })
})
