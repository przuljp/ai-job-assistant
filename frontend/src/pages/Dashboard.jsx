import { useEffect, useState } from 'react'
import api from '../api/api.js'
import AppNav from '../components/AppNav.jsx'
import StatCard from '../components/StatCard.jsx'

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard')

        if (active) {
          setData(response.data)
        }
      } catch (requestError) {
        if (active && requestError.response?.status !== 401) {
          setError('Unable to load the dashboard. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <main>
        <AppNav />
        <p>Loading dashboard...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <AppNav />
        <h1>Dashboard</h1>
        <p role="alert">{error}</p>
      </main>
    )
  }

  return (
    <main>
      <AppNav />
      <h1>Dashboard</h1>

      <section aria-label="Application statistics">
        <StatCard label="Total Applications" value={data.total_applications} />
        <StatCard label="Saved" value={data.saved_count} />
        <StatCard label="Applied" value={data.applied_count} />
        <StatCard label="Interviews" value={data.interview_count} />
        <StatCard label="Rejected" value={data.rejected_count} />
        <StatCard label="Accepted" value={data.accepted_count} />
        <StatCard label="Resumes" value={data.resume_count} />
        <StatCard label="AI Analyses" value={data.analysis_count} />
      </section>

      <section aria-labelledby="latest-applications-heading">
        <h2 id="latest-applications-heading">Latest Applications</h2>

        {data.latest_applications.length === 0 ? (
          <p>No applications yet.</p>
        ) : (
          <ul>
            {data.latest_applications.map((application) => (
              <li key={application.id}>
                <h3>{application.position}</h3>
                <p>{application.company}</p>
                <p>Status: {application.status}</p>
                {application.application_date && (
                  <p>Application date: {application.application_date}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default Dashboard
