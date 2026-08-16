import { useEffect, useState } from 'react'
import { BriefcaseBusiness, LoaderCircle, Plus, Save, X } from 'lucide-react'
import api from '../api/api.js'
import AIAnalysisPanel from '../components/AIAnalysisPanel.jsx'
import ApplicationCard from '../components/ApplicationCard.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'

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
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">Pipeline</p>
        <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track opportunities, update their status, and compare your resume to
          each role.
        </p>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              {editingId !== null ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <CardTitle>
                <h2 id="application-form-heading">
                  {editingId !== null
                    ? 'Edit Application'
                    : 'Add Application'}
                </h2>
              </CardTitle>
              <CardDescription>
                {editingId !== null
                  ? 'Update the details for this opportunity.'
                  : 'Add an opportunity to your job search pipeline.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <section aria-labelledby="application-form-heading">
            <form
              className="grid gap-5 sm:grid-cols-2"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
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

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
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

              <div className="space-y-2">
                <Label htmlFor="job-url">Job URL</Label>
                <Input
                  id="job-url"
                  name="job_url"
                  type="url"
                  placeholder="https://company.com/jobs/..."
                  value={formData.job_url}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

              <div className="space-y-2">
                <Label htmlFor="application-date">Application date</Label>
                <Input
                  id="application-date"
                  name="application_date"
                  type="date"
                  value={formData.application_date}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="job-description">Job description</Label>
                <Textarea
                  id="job-description"
                  name="job_description"
                  className="min-h-32"
                  placeholder="Paste the role requirements and responsibilities..."
                  value={formData.job_description}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Contacts, follow-up dates, or preparation notes..."
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>

              {formError && (
                <Alert variant="destructive" className="sm:col-span-2">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {submitting
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Update Application'
                      : 'Create Application'}
                </Button>

                {editingId !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    <X data-icon="inline-start" aria-hidden="true" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </section>
        </CardContent>
      </Card>

      {(success || error) && (
        <Alert variant={error ? 'destructive' : 'default'}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      <section
        aria-labelledby="application-list-heading"
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <BriefcaseBusiness className="size-5 text-primary" aria-hidden="true" />
          <h2
            id="application-list-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Your Applications
          </h2>
        </div>
        <Separator />

        {loading ? (
          <div className="flex items-center py-8 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
            <p>Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center">
            <BriefcaseBusiness
              className="mx-auto mb-3 size-8 text-muted-foreground/60"
              aria-hidden="true"
            />
            <p className="font-medium">No applications yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first opportunity using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                deleting={deletingId === application.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <AIAnalysisPanel
        applications={applications}
        applicationsLoading={loading}
      />
    </div>
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
