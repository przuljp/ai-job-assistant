import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, LoaderCircle, Sparkles } from 'lucide-react'
import api from '../api/api.js'
import AIAnalysisResult from './AIAnalysisResult.jsx'
import AnalysisHistory from './AnalysisHistory.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'

function toAnalysisSummary(analysis) {
  return {
    id: analysis.id,
    job_application_id: analysis.job_application_id,
    resume_id: analysis.resume_id,
    match_score: analysis.match_score,
    created_at: analysis.created_at,
  }
}

function prependAnalysisSummary(current, analysis) {
  const summary = toAnalysisSummary(analysis)
  return [summary, ...current.filter((item) => item.id !== summary.id)]
}

function requestAnalysis(apiClient, applicationId, resumeId) {
  return apiClient.post(`/applications/${applicationId}/analyze`, {
    resume_id: Number(resumeId),
  })
}

function requestAnalysisHistory(apiClient, applicationId) {
  return apiClient.get(`/applications/${applicationId}/analyses`)
}

function requestAnalysisDetails(apiClient, analysisId) {
  return apiClient.get(`/analyses/${analysisId}`)
}

function getAnalysisErrorMessage(requestError) {
  if (!requestError.response) {
    return 'Unable to connect to the server. Please try again.'
  }

  switch (requestError.response.status) {
    case 400:
      return 'This application needs a meaningful job description before it can be analyzed.'
    case 404:
      return 'The selected application or resume could not be found.'
    case 422:
      return 'The resume could not be processed for analysis. Check that it is a readable PDF.'
    case 502:
      return 'AI analysis is temporarily unavailable. Please try again later.'
    case 503:
      return 'AI analysis is not configured on the server.'
    default:
      return requestError.response.status === 401
        ? ''
        : 'Unable to analyze this application. Please try again.'
  }
}

function AIAnalysisPanel({ applications, applicationsLoading }) {
  const [resumes, setResumes] = useState([])
  const [resumesLoading, setResumesLoading] = useState(true)
  const [resumesError, setResumesError] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [currentAnalysis, setCurrentAnalysis] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [viewingId, setViewingId] = useState(null)

  useEffect(() => {
    let active = true

    async function loadResumes() {
      try {
        const response = await api.get('/resumes')

        if (active) {
          setResumes(response.data)
        }
      } catch (requestError) {
        if (active && requestError.response?.status !== 401) {
          setResumesError('Unable to load resumes. Please try again.')
        }
      } finally {
        if (active) {
          setResumesLoading(false)
        }
      }
    }

    loadResumes()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (
      selectedApplicationId &&
      !applications.some(
        (application) => application.id === Number(selectedApplicationId),
      )
    ) {
      setSelectedApplicationId('')
      setCurrentAnalysis(null)
      setAnalysisError('')
    }
  }, [applications, selectedApplicationId])

  useEffect(() => {
    if (!selectedApplicationId) {
      setAnalyses([])
      setHistoryError('')
      setHistoryLoading(false)
      return undefined
    }

    let active = true
    setHistoryLoading(true)
    setHistoryError('')

    async function loadHistory() {
      try {
        const response = await requestAnalysisHistory(
          api,
          selectedApplicationId,
        )

        if (active) {
          setAnalyses(response.data)
        }
      } catch (requestError) {
        if (active && requestError.response?.status !== 401) {
          setAnalyses([])
          setHistoryError(
            requestError.response?.status === 404
              ? 'That application could not be found.'
              : 'Unable to load analysis history. Please try again.',
          )
        }
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [selectedApplicationId])

  function handleApplicationChange(event) {
    setSelectedApplicationId(event.target.value)
    setCurrentAnalysis(null)
    setAnalysisError('')
  }

  async function handleAnalyze(event) {
    event.preventDefault()
    setAnalysisError('')

    if (!selectedApplicationId) {
      setAnalysisError('Please select a job application.')
      return
    }

    if (!selectedResumeId) {
      setAnalysisError('Please select a resume.')
      return
    }

    setAnalyzing(true)

    try {
      const response = await requestAnalysis(
        api,
        selectedApplicationId,
        selectedResumeId,
      )

      setCurrentAnalysis(response.data)
      setAnalyses((current) =>
        prependAnalysisSummary(current, response.data),
      )
    } catch (requestError) {
      setAnalysisError(getAnalysisErrorMessage(requestError))
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleView(analysisId) {
    setAnalysisError('')
    setViewingId(analysisId)

    try {
      const response = await requestAnalysisDetails(api, analysisId)
      setCurrentAnalysis(response.data)
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setAnalysisError('That analysis could not be found.')
      } else if (!requestError.response) {
        setAnalysisError('Unable to connect to the server. Please try again.')
      } else if (requestError.response.status !== 401) {
        setAnalysisError('Unable to load that analysis. Please try again.')
      }
    } finally {
      setViewingId(null)
    }
  }

  return (
    <section aria-labelledby="ai-analysis-heading" className="space-y-6">
      <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/[0.025] shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>
                <h2 id="ai-analysis-heading">Resume Match Analysis</h2>
              </CardTitle>
              <CardDescription>
                Compare a saved resume with a job description using structured
                AI feedback.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid items-end gap-5 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={handleAnalyze}
          >
            <div className="space-y-2">
              <Label htmlFor="analysis-application">Job application</Label>
              <select
                id="analysis-application"
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
                value={selectedApplicationId}
                onChange={handleApplicationChange}
                disabled={applicationsLoading || applications.length === 0}
                required
              >
                <option value="">Select an application</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.position} at {application.company}
                  </option>
                ))}
              </select>
              {applicationsLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading applications...
                </p>
              ) : applications.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create a job application before running an analysis.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-resume">Resume</Label>
              <select
                id="analysis-resume"
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
                value={selectedResumeId}
                onChange={(event) => {
                  setSelectedResumeId(event.target.value)
                  setAnalysisError('')
                }}
                disabled={resumesLoading || resumes.length === 0}
                required
              >
                <option value="">Select a resume</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
              </select>
              {resumesLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading resumes...
                </p>
              ) : resumes.length === 0 && !resumesError ? (
                <p className="text-xs text-muted-foreground">
                  No resumes uploaded.{' '}
                  <Link
                    className="font-medium text-primary hover:underline"
                    to="/resumes"
                  >
                    Upload a resume
                  </Link>{' '}
                  first.
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={
                analyzing ||
                !selectedApplicationId ||
                !selectedResumeId ||
                resumesLoading
              }
            >
              {analyzing ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Bot data-icon="inline-start" aria-hidden="true" />
              )}
              {analyzing ? 'Analyzing...' : 'Analyze Resume'}
            </Button>

            {(resumesError || analysisError) && (
              <Alert variant="destructive" className="md:col-span-3">
                <AlertDescription>
                  {analysisError || resumesError}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <AIAnalysisResult analysis={currentAnalysis} />

      {selectedApplicationId && (
        <AnalysisHistory
          analyses={analyses}
          loading={historyLoading}
          error={historyError}
          resumes={resumes}
          viewingId={viewingId}
          selectedId={currentAnalysis?.id ?? null}
          onView={handleView}
        />
      )}
    </section>
  )
}

export {
  getAnalysisErrorMessage,
  prependAnalysisSummary,
  requestAnalysis,
  requestAnalysisDetails,
  requestAnalysisHistory,
  toAnalysisSummary,
}
export default AIAnalysisPanel
