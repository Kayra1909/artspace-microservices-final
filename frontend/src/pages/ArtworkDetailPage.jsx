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
        setError(err.response?.status === 404 ? 'Artwork not found.' : 'Failed to load artwork.')
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

  if (loading) return <p className="muted">Loading…</p>
  if (error) return (
    <div>
      <p className="error-text">{error}</p>
      <Link to="/artworks">← Back to artworks</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/artworks" style={{ fontSize: '0.9rem', color: '#64748b' }}>← Back to artworks</Link>

      <h1 style={{ fontSize: '1.75rem', margin: '1rem 0 0.25rem' }}>{artwork.title}</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>
        by <strong>{artwork.artistUsername}</strong> · {artwork.category} ·{' '}
        {new Date(artwork.createdAt).toLocaleDateString()}
      </p>

      {artwork.imageUrl && (
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, marginBottom: '1rem', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      )}

      {artwork.description && (
        <p style={{ marginBottom: '2rem', lineHeight: 1.6, color: '#374151' }}>{artwork.description}</p>
      )}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <p className="muted" style={{ marginBottom: '1.5rem' }}>No comments yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {comments.map(c => (
            <div key={c.id} className="card" style={{ padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>{c.username}</strong>
                <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                  {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                </span>
              </div>
              <p style={{ color: '#374151', fontSize: '0.9rem' }}>{c.content}</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {token ? (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Leave a comment</h3>
          <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
            <div>
              <label className="field-label">Comment</label>
              <textarea
                value={newComment.content}
                onChange={e => setNewComment({ ...newComment, content: e.target.value })}
                rows={3}
                required
                style={{ resize: 'vertical', width: '100%', padding: '0.5rem 0.75rem', fontFamily: 'inherit', fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
              />
            </div>
            <div>
              <label className="field-label">Rating</label>
              <select
                value={newComment.rating}
                onChange={e => setNewComment({ ...newComment, rating: e.target.value })}
                style={{ width: 'auto', padding: '0.4rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            {submitError && <p className="error-text">{submitError}</p>}
            <div>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p className="muted" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <Link to="/login">Login</Link> to leave a comment.
        </p>
      )}
    </div>
  )
}
