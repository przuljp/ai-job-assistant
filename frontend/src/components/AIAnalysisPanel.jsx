import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api.js'
import AIAnalysisResult from './AIAnalysisResult.jsx'
import AnalysisHistory from './AnalysisHistory.jsx'

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
    <section aria-labelledby="ai-analysis-heading">
      <h2 id="ai-analysis-heading">Resume Match Analysis</h2>

      <form onSubmit={handleAnalyze}>
        <div>
          <label htmlFor="analysis-application">Job application</label>
          <select
            id="analysis-application"
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
        </div>

        {applicationsLoading ? (
          <p>Loading applications...</p>
        ) : applications.length === 0 ? (
          <p>Create a job application before running an analysis.</p>
        ) : null}

        <div>
          <label htmlFor="analysis-resume">Resume</label>
          <select
            id="analysis-resume"
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
        </div>

        {resumesLoading ? (
          <p>Loading resumes...</p>
        ) : resumes.length === 0 && !resumesError ? (
          <p>
            No resumes uploaded. <Link to="/resumes">Upload a resume</Link>{' '}
            before running an analysis.
          </p>
        ) : null}

        {resumesError && <p role="alert">{resumesError}</p>}
        {analysisError && <p role="alert">{analysisError}</p>}

        <button
          type="submit"
          disabled={
            analyzing ||
            !selectedApplicationId ||
            !selectedResumeId ||
            resumesLoading
          }
        >
          {analyzing ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </form>

      <AIAnalysisResult analysis={currentAnalysis} />

      {selectedApplicationId && (
        <AnalysisHistory
          analyses={analyses}
          loading={historyLoading}
          error={historyError}
          resumes={resumes}
          viewingId={viewingId}
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
