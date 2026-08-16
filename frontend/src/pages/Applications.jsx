import { useEffect, useState } from 'react'
import api from '../api/api.js'
import AppNav from '../components/AppNav.jsx'
import ApplicationCard from '../components/ApplicationCard.jsx'

const STATUS_OPTIONS = [
  'Saved',
  'Applied',
  'Interview',
  'Rejected',
  'Accepted',
]

const EMPTY_FORM = {
  company: '',
  position: '',
  job_url: '',
  job_description: '',
  status: 'Saved',
  application_date: '',
  notes: '',
}

function buildPayload(formData) {
  return {
    company: formData.company,
    position: formData.position,
    job_url: formData.job_url || null,
    job_description: formData.job_description || null,
    status: formData.status,
    application_date: formData.application_date || null,
    notes: formData.notes || null,
  }
}

function applicationToFormData(application) {
  return {
    company: application.company,
    position: application.position,
    job_url: application.job_url || '',
    job_description: application.job_description || '',
    status: application.status,
    application_date: application.application_date || '',
    notes: application.notes || '',
  }
}

function addApplication(current, application) {
  return [application, ...current]
}

function replaceApplication(current, updatedApplication) {
  return current.map((application) =>
    application.id === updatedApplication.id ? updatedApplication : application,
  )
}

function removeApplication(current, applicationId) {
  return current.filter((application) => application.id !== applicationId)
}

function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function loadApplications() {
      try {
        const response = await api.get('/applications')

        if (active) {
          setApplications(response.data)
        }
      } catch (requestError) {
        if (active && requestError.response?.status !== 401) {
          setError('Unable to load applications. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadApplications()

    return () => {
      active = false
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const payload = buildPayload(formData)

      if (editingId !== null) {
        const response = await api.put(`/applications/${editingId}`, payload)
        setApplications((current) =>
          replaceApplication(current, response.data),
        )
        setSuccess('Application updated.')
      } else {
        const response = await api.post('/applications', payload)
        setApplications((current) => addApplication(current, response.data))
        setSuccess('Application created.')
      }

      resetForm()
    } catch (requestError) {
      if (requestError.response?.status === 422) {
        setFormError('Please check that all application fields are valid.')
      } else if (!requestError.response) {
        setFormError('Unable to connect to the server. Please try again.')
      } else if (requestError.response?.status !== 401) {
        setFormError('Unable to save the application. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(application) {
    setEditingId(application.id)
    setFormData(applicationToFormData(application))
    setFormError('')
    setSuccess('')
  }

  async function handleDelete(application) {
    const confirmed = window.confirm(
      `Delete the application for ${application.position} at ${application.company}?`,
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setDeletingId(application.id)

    try {
      await api.delete(`/applications/${application.id}`)
      setApplications((current) =>
        removeApplication(current, application.id),
      )

      if (editingId === application.id) {
        resetForm()
      }

      setSuccess('Application deleted.')
    } catch (requestError) {
      if (!requestError.response) {
        setError('Unable to connect to the server. Please try again.')
      } else if (requestError.response?.status !== 401) {
        setError('Unable to delete the application. Please try again.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main>
      <AppNav />
      <h1>Applications</h1>

      <section aria-labelledby="application-form-heading">
        <h2 id="application-form-heading">
          {editingId !== null ? 'Edit Application' : 'Add Application'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              minLength={1}
              maxLength={150}
              value={formData.company}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="position">Position</label>
            <input
              id="position"
              name="position"
              type="text"
              minLength={1}
              maxLength={150}
              value={formData.position}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="job-url">Job URL</label>
            <input
              id="job-url"
              name="job_url"
              type="url"
              value={formData.job_url}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="job-description">Job description</label>
            <textarea
              id="job-description"
              name="job_description"
              value={formData.job_description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="application-date">Application date</label>
            <input
              id="application-date"
              name="application_date"
              type="date"
              value={formData.application_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {formError && <p role="alert">{formError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : editingId !== null
                ? 'Update Application'
                : 'Create Application'}
          </button>{' '}

          {editingId !== null && (
            <button type="button" onClick={resetForm} disabled={submitting}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {success && <p>{success}</p>}
      {error && <p role="alert">{error}</p>}

      <section aria-labelledby="application-list-heading">
        <h2 id="application-list-heading">Your Applications</h2>

        {loading ? (
          <p>Loading applications...</p>
        ) : applications.length === 0 ? (
          <p>No applications yet.</p>
        ) : (
          applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              deleting={deletingId === application.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>
    </main>
  )
}

export {
  STATUS_OPTIONS,
  addApplication,
  applicationToFormData,
  buildPayload,
  removeApplication,
  replaceApplication,
}
export default Applications
