import { useEffect, useState } from 'react'
import {
  Archive,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  Send,
  UsersRound,
  XCircle,
} from 'lucide-react'
import api from '../api/api.js'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'

const STATISTICS = [
  ['Total Applications', 'total_applications', BriefcaseBusiness],
  ['Saved', 'saved_count', Archive],
  ['Applied', 'applied_count', Send],
  ['Interviews', 'interview_count', UsersRound],
  ['Rejected', 'rejected_count', XCircle],
  ['Accepted', 'accepted_count', CheckCircle2],
  ['Resumes', 'resume_count', FileText],
  ['AI Analyses', 'analysis_count', Bot],
]

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
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Overview</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">Overview</p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A quick view of your job search activity and recent progress.
        </p>
      </header>

      <section
        aria-label="Application statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {STATISTICS.map(([label, key, icon]) => (
          <StatCard key={key} label={label} value={data[key]} icon={icon} />
        ))}
      </section>

      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-5">
          <CardTitle>
            <h2 id="latest-applications-heading">Latest Applications</h2>
          </CardTitle>
          <CardDescription>
            Your most recently updated opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <section aria-labelledby="latest-applications-heading">
            {data.latest_applications.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <Clock3
                  className="mb-3 size-8 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <p className="font-medium">No applications yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your latest opportunities will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {data.latest_applications.map((application) => (
                  <li
                    key={application.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">
                        {application.position}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {application.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {application.application_date && (
                        <p className="text-xs text-muted-foreground">
                          {application.application_date}
                        </p>
                      )}
                      <StatusBadge status={application.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export { STATISTICS }
export default Dashboard
