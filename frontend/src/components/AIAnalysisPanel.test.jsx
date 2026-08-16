import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api.js'
import AIAnalysisPanel from './AIAnalysisPanel.jsx'

vi.mock('../api/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const applications = [
  { id: 12, position: 'Backend Engineer', company: 'Acme' },
]
const resume = { id: 34, title: 'Backend Resume' }
const fullAnalysis = {
  id: 56,
  job_application_id: 12,
  resume_id: 34,
  match_score: 82,
  created_at: '2026-08-16T12:00:00Z',
  summary: 'Strong backend profile.',
  strengths: ['Python', 'FastAPI'],
  missing_skills: ['AWS'],
  recommendations: ['Highlight Docker experience.'],
}

function renderPanel() {
  render(
    <MemoryRouter>
      <AIAnalysisPanel
        applications={applications}
        applicationsLoading={false}
      />
    </MemoryRouter>,
  )
}

describe('AIAnalysisPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits selected IDs and renders the structured analysis', async () => {
    const user = userEvent.setup()
    api.get.mockImplementation((url) => {
      if (url === '/resumes') return Promise.resolve({ data: [resume] })
      if (url === '/applications/12/analyses') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
    api.post.mockResolvedValueOnce({ data: fullAnalysis })
    renderPanel()

    await waitFor(() =>
      expect(screen.getByLabelText('Resume')).toBeEnabled(),
    )
    await user.selectOptions(screen.getByLabelText('Job application'), '12')
    await user.selectOptions(screen.getByLabelText('Resume'), '34')
    await user.click(screen.getByRole('button', { name: 'Analyze Resume' }))

    expect(api.post).toHaveBeenCalledWith('/applications/12/analyze', {
      resume_id: 34,
    })
    expect(await screen.findByText('Match score: 82%')).toBeVisible()
    expect(screen.getByText('Strong backend profile.')).toBeVisible()
    expect(screen.getByText('Python')).toBeVisible()
    expect(screen.getByText('AWS')).toBeVisible()
    expect(screen.getByText('Highlight Docker experience.')).toBeVisible()
  })

  it('views history with GET and does not start another analysis', async () => {
    const user = userEvent.setup()
    api.get.mockImplementation((url) => {
      if (url === '/resumes') return Promise.resolve({ data: [resume] })
      if (url === '/applications/12/analyses') {
        return Promise.resolve({
          data: [
            {
              id: 56,
              job_application_id: 12,
              resume_id: 34,
              match_score: 82,
              created_at: '2026-08-16T12:00:00Z',
            },
          ],
        })
      }
      if (url === '/analyses/56') {
        return Promise.resolve({ data: fullAnalysis })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
    renderPanel()

    await user.selectOptions(screen.getByLabelText('Job application'), '12')
    await user.click(await screen.findByRole('button', { name: 'View' }))

    expect(api.get).toHaveBeenCalledWith('/analyses/56')
    expect(api.post).not.toHaveBeenCalled()
    expect(await screen.findByText('Strong backend profile.')).toBeVisible()
  })
})
