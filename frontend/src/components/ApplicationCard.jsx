function ApplicationCard({ application, deleting, onEdit, onDelete }) {
  return (
    <article>
      <h2>{application.position}</h2>
      <p>{application.company}</p>
      <p>Status: {application.status}</p>

      {application.application_date && (
        <p>Application date: {application.application_date}</p>
      )}

      {application.job_url && (
        <p>
          <a href={application.job_url} target="_blank" rel="noreferrer">
            View job posting
          </a>
        </p>
      )}

      {application.job_description && (
        <p>Job description: {application.job_description}</p>
      )}

      {application.notes && <p>Notes: {application.notes}</p>}

      <button type="button" onClick={() => onEdit(application)}>
        Edit
      </button>{' '}
      <button
        type="button"
        disabled={deleting}
        onClick={() => onDelete(application)}
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </article>
  )
}

export default ApplicationCard
