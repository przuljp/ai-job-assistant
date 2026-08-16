import { formatAnalysisDate } from './AIAnalysisResult.jsx'

function getResumeTitle(resumes, resumeId) {
  return (
    resumes.find((resume) => resume.id === resumeId)?.title ||
    `Resume #${resumeId}`
  )
}

function AnalysisHistory({
  analyses,
  loading,
  error,
  resumes,
  viewingId,
  onView,
}) {
  return (
    <section aria-labelledby="analysis-history-heading">
      <h2 id="analysis-history-heading">Analysis History</h2>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading analysis history...</p>
      ) : analyses.length === 0 ? (
        <p>No previous analyses for this application.</p>
      ) : (
        analyses.map((analysis) => (
          <article key={analysis.id}>
            <h3>{analysis.match_score}% match</h3>
            <p>{getResumeTitle(resumes, analysis.resume_id)}</p>
            <p>Created {formatAnalysisDate(analysis.created_at)}</p>
            <button
              type="button"
              disabled={viewingId === analysis.id}
              onClick={() => onView(analysis.id)}
            >
              {viewingId === analysis.id ? 'Loading...' : 'View'}
            </button>
          </article>
        ))
      )}
    </section>
  )
}

export { getResumeTitle }
export default AnalysisHistory
