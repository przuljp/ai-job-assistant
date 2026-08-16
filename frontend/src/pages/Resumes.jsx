import { useEffect, useState } from 'react'
import { FileText, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import api from '../api/api.js'
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

function addResume(current, resume) {
  return [resume, ...current]
}

function removeResume(current, resumeId) {
  return current.filter((resume) => resume.id !== resumeId)
}

function isPdfFile(file) {
  return (
    file?.type === 'application/pdf' &&
    file?.name?.toLowerCase().endsWith('.pdf')
  )
}

function buildResumeFormData(title, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title.trim())
  return formData
}

function formatUploadedAt(uploadedAt) {
  if (!uploadedAt) {
    return 'Upload date unavailable'
  }

  const date = new Date(uploadedAt)
  return Number.isNaN(date.getTime())
    ? 'Upload date unavailable'
    : date.toLocaleString()
}

function Resumes() {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)

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
          setError('Unable to load resumes. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadResumes()

    return () => {
      active = false
    }
  }, [])

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] || null)
    setFormError('')
    setSuccess('')
  }

  async function handleUpload(event) {
    event.preventDefault()
    setFormError('')
    setSuccess('')

    if (!title.trim()) {
      setFormError('Please enter a resume title.')
      return
    }

    if (!selectedFile) {
      setFormError('Please select a PDF resume.')
      return
    }

    if (!isPdfFile(selectedFile)) {
      setFormError('Please select a PDF file.')
      return
    }

    setUploading(true)

    try {
      const formData = buildResumeFormData(title, selectedFile)
      const response = await api.post('/resumes/upload', formData)

      setResumes((current) => addResume(current, response.data))
      setTitle('')
      setSelectedFile(null)
      setFileInputKey((current) => current + 1)
      setSuccess('Resume uploaded.')
    } catch (requestError) {
      if (!requestError.response) {
        setFormError('Unable to connect to the server. Please try again.')
      } else if (requestError.response.status === 400) {
        setFormError('The server only accepts PDF resume files.')
      } else if (requestError.response.status === 413) {
        setFormError('This file is too large to upload.')
      } else if (requestError.response.status === 422) {
        setFormError('Please check the resume title and selected file.')
      } else if (requestError.response.status !== 401) {
        setFormError('Unable to upload the resume. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(resume) {
    const confirmed = window.confirm(`Delete the resume "${resume.title}"?`)

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setDeletingId(resume.id)

    try {
      await api.delete(`/resumes/${resume.id}`)
      setResumes((current) => removeResume(current, resume.id))
      setSuccess('Resume deleted.')
    } catch (requestError) {
      if (!requestError.response) {
        setError('Unable to connect to the server. Please try again.')
      } else if (requestError.response.status === 404) {
        setError('That resume could not be found. Refresh and try again.')
      } else if (requestError.response.status !== 401) {
        setError('Unable to delete the resume. Please try again.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">Documents</p>
        <h1 className="text-3xl font-semibold tracking-tight">Resumes</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep focused resume versions ready for different roles and analyses.
        </p>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <UploadCloud className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>
                <h2 id="resume-upload-heading">Upload a Resume</h2>
              </CardTitle>
              <CardDescription>
                Add a clearly named PDF to your resume library.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <section aria-labelledby="resume-upload-heading">
            <form
              className="grid items-end gap-5 md:grid-cols-[1fr_1.4fr_auto]"
              onSubmit={handleUpload}
            >
              <div className="space-y-2">
                <Label htmlFor="resume-title">Title</Label>
                <Input
                  id="resume-title"
                  type="text"
                  minLength={1}
                  maxLength={100}
                  placeholder="Backend engineer resume"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-file">PDF file</Label>
                <Input
                  key={fileInputKey}
                  id="resume-file"
                  className="cursor-pointer file:mr-3"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>

              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <UploadCloud data-icon="inline-start" aria-hidden="true" />
                )}
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </Button>

              {formError && (
                <Alert variant="destructive" className="md:col-span-3">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
            </form>
          </section>
        </CardContent>
      </Card>

      {(success || error) && (
        <Alert variant={error ? 'destructive' : 'default'}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="resume-list-heading" className="space-y-5">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" aria-hidden="true" />
          <h2
            id="resume-list-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Your Resumes
          </h2>
        </div>
        <Separator />

        {loading ? (
          <div className="flex items-center py-8 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
            <p>Loading resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center">
            <FileText
              className="mx-auto mb-3 size-8 text-muted-foreground/60"
              aria-hidden="true"
            />
            <p className="font-medium">No resumes yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your first PDF using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <article key={resume.id}>
                <Card className="h-full gap-4 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex-row items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{resume.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uploaded {formatUploadedAt(resume.uploaded_at)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(resume)}
                      disabled={deletingId === resume.id}
                    >
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                      {deletingId === resume.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export {
  addResume,
  buildResumeFormData,
  formatUploadedAt,
  isPdfFile,
  removeResume,
}
export default Resumes
