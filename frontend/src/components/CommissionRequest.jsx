import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

const emptyRequest = { title: '', description: '', budget: '', deadline: '' }

// Commission-request card shown on an artist's artwork detail page and on their
// profile page. Pass `artworkId` when the request is tied to a specific piece;
// omit it for a general request from the profile. Renders nothing for anonymous
// visitors or the artist viewing their own work/profile.
export default function CommissionRequest({ artistId, artistUsername, artworkId, style }) {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyRequest)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!token || (user && user.id === artistId)) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/Request', {
        title: form.title,
        description: form.description,
        budget: form.budget ? Number(form.budget) : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        artistId,
        artistUsername,
        artworkId: artworkId ?? null,
      })
      setForm(emptyRequest)
      setShowForm(false)
      setSuccess('Your request has been submitted successfully.')
    } catch (err) {
      const msg = err.response?.data
      if (typeof msg === 'string' && msg.trim()) {
        // A real validation/business error from RequestService — show it verbatim.
        setError(msg)
      } else if (!err.response || err.response.status >= 500) {
        // No response (gateway/service unreachable) or a 5xx — e.g. RequestService
        // is down and Ocelot returns a 503 with an empty body. Avoid setting an
        // empty string here, which would render nothing under the form.
        setError('The request service is unavailable right now. Please try again later.')
      } else {
        setError('Failed to submit request.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      marginBottom: '2rem',
      background: '#F8F5FF',
      border: '1px solid #DDD6F7',
      borderRadius: 12,
      padding: '1.25rem 1.4rem',
      ...style,
    }}>
      {success ? (
        <p className="success-text" style={{ margin: 0 }}>
          {success} <Link to="/requests">View your requests →</Link>
        </p>
      ) : !showForm ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#1F1B2D' }}>Want a custom piece?</strong>
            <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              Send {artistUsername} an artwork request.
            </p>
          </div>
          <button className="btn-primary" style={{ flexShrink: 0 }} onClick={() => { setError(''); setShowForm(true) }}>
            Request a commission
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-stack">
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.4rem', color: '#1F1B2D' }}>
            Request a commission from {artistUsername}
          </h3>
          <div>
            <label className="field-label">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Portrait of my dog"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe what you'd like…"
              required
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <label className="field-label">Budget <span className="muted">(optional)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={e => setForm({ ...form, budget: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label className="field-label">Deadline <span className="muted">(optional)</span></label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setError('') }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
