import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

export default function ArtworkDetailPage() {
  const { id } = useParams()
  const [artwork, setArtwork] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState({ content: '', rating: 5 })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const token = localStorage.getItem('token')

  function loadComments() {
    return api.get(`/api/Comment/artwork/${id}`).then(r => setComments(r.data))
  }

  useEffect(() => {
    Promise.all([
      api.get(`/api/Artwork/${id}`),
      api.get(`/api/Comment/artwork/${id}`),
    ])
      .then(([artRes, commRes]) => {
        setArtwork(artRes.data)
        setComments(commRes.data)
      })
      .catch(err => {
        setError(err.response?.status === 404 ? 'Artwork not found.' : 'Could not load artwork.')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleCommentSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      await api.post('/api/Comment', {
        content: newComment.content,
        rating: Number(newComment.rating),
        artworkId: id,
        artistId: artwork?.artistId,
      })
      await loadComments()
      setNewComment({ content: '', rating: 5 })
    } catch (err) {
      const msg = err.response?.data
      setSubmitError(typeof msg === 'string' ? msg : 'Failed to post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="loading-text">Loading…</p>
  if (error) return (
    <div>
      <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
      <Link to="/artworks">← Back to artworks</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 740 }}>
      <Link to="/artworks" style={{ fontSize: '0.875rem', color: '#64748b' }}>← Back to artworks</Link>

      <div style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>{artwork.title}</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          by <strong style={{ color: '#374151' }}>{artwork.artistUsername}</strong>
          {' · '}{artwork.category}
          {' · '}{new Date(artwork.createdAt).toLocaleDateString()}
        </p>
      </div>

      {artwork.imageUrl && (
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          style={{
            maxWidth: '100%', maxHeight: 420,
            borderRadius: 8, marginBottom: '1.25rem',
            objectFit: 'cover', display: 'block',
            border: '1px solid #e2e8f0',
          }}
          onError={e => { e.target.style.display = 'none' }}
        />
      )}

      {artwork.description && (
        <p style={{ marginBottom: '2rem', lineHeight: 1.65, color: '#374151', fontSize: '0.95rem' }}>
          {artwork.description}
        </p>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
        Comments {comments.length > 0 && <span style={{ fontWeight: 400, color: '#64748b' }}>({comments.length})</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="muted" style={{ marginBottom: '1.5rem' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
          {comments.map(c => (
            <div key={c.id} style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '0.8rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{c.username}</strong>
                <span style={{ color: '#f59e0b', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                  {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                </span>
              </div>
              <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.5 }}>{c.content}</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {token ? (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Leave a comment</h3>
          <form onSubmit={handleCommentSubmit} className="form-stack" style={{ maxWidth: 500 }}>
            <div>
              <label className="field-label">Comment</label>
              <textarea
                value={newComment.content}
                onChange={e => setNewComment({ ...newComment, content: e.target.value })}
                rows={3}
                placeholder="Share your thoughts…"
                required
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="field-label">Rating</label>
              <select
                value={newComment.rating}
                onChange={e => setNewComment({ ...newComment, rating: e.target.value })}
                style={{ width: 'auto' }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            {submitError && <p className="error-text">{submitError}</p>}
            <div>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p className="muted" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <Link to="/login">Log in</Link> to leave a comment.
        </p>
      )}
    </div>
  )
}
