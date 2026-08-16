function formatAnalysisDate(createdAt) {
  if (!createdAt) {
    return 'Date unavailable'
  }

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString()
}

function ResultList({ items, emptyMessage }) {
  return items?.length > 0 ? (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  ) : (
    <p>{emptyMessage}</p>
  )
}

function AIAnalysisResult({ analysis }) {
  if (!analysis) {
    return null
  }

  return (
    <section aria-labelledby="analysis-result-heading">
      <h2 id="analysis-result-heading">Analysis Result</h2>
      <p>
        <strong>Match score: {analysis.match_score}%</strong>
      </p>
      <p>Created {formatAnalysisDate(analysis.created_at)}</p>

      <h3>Summary</h3>
      <p>{analysis.summary}</p>

      <h3>Strengths</h3>
      <ResultList
        items={analysis.strengths}
        emptyMessage="No specific strengths were identified."
      />

      <h3>Missing Skills</h3>
      <ResultList
        items={analysis.missing_skills}
        emptyMessage="No missing skills were identified."
      />

      <h3>Recommendations</h3>
      <ResultList
        items={analysis.recommendations}
        emptyMessage="No recommendations were provided."
      />
    </section>
  )
}

export { ResultList, formatAnalysisDate }
export default AIAnalysisResult
