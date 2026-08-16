import { useEffect, useState } from 'react'
import api from '../api/api.js'
import AppNav from '../components/AppNav.jsx'

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
    <main>
      <AppNav />
      <h1>Resumes</h1>

      <section aria-labelledby="resume-upload-heading">
        <h2 id="resume-upload-heading">Upload a Resume</h2>

        <form onSubmit={handleUpload}>
          <div>
            <label htmlFor="resume-title">Title</label>
            <input
              id="resume-title"
              type="text"
              minLength={1}
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="resume-file">PDF file</label>
            <input
              key={fileInputKey}
              id="resume-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
            />
          </div>

          {formError && <p role="alert">{formError}</p>}

          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </button>
        </form>
      </section>

      {success && <p>{success}</p>}
      {error && <p role="alert">{error}</p>}

      <section aria-labelledby="resume-list-heading">
        <h2 id="resume-list-heading">Your Resumes</h2>

        {loading ? (
          <p>Loading resumes...</p>
        ) : resumes.length === 0 ? (
          <p>No resumes yet.</p>
        ) : (
          resumes.map((resume) => (
            <article key={resume.id}>
              <h3>{resume.title}</h3>
              <p>Uploaded {formatUploadedAt(resume.uploaded_at)}</p>
              <button
                type="button"
                onClick={() => handleDelete(resume)}
                disabled={deletingId === resume.id}
              >
                {deletingId === resume.id ? 'Deleting...' : 'Delete'}
              </button>
            </article>
          ))
        )}
      </section>
    </main>
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
