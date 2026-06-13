import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import StarRating from '../components/StarRating'
import CommissionRequest from '../components/CommissionRequest'

export default function ArtworkDetailPage() {
  const { id } = useParams()
  const [artwork, setArtwork] = useState(null)
  const [comments, setComments] = useState([])
  const [rating, setRating] = useState({ averageRating: 0, ratingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Parent review form
  const [newReview, setNewReview] = useState({ content: '', rating: 5 })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Inline edit / reply state (keyed by comment id)
  const [editing, setEditing] = useState(null) // { id, content, rating, isReply }
  const [replyingTo, setReplyingTo] = useState(null) // parent id
  const [replyContent, setReplyContent] = useState('')
  const [rowError, setRowError] = useState('')

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isArtworkArtist = user && artwork && user.id === artwork.artistId
  // One review per user: comments are top-level reviews, so a matching author means
  // this user has already reviewed and the "Leave a review" form is hidden.
  const hasReviewed = user && comments.some(c => c.userId === user.id)

  function loadComments() {
    return api.get(`/api/Comment/artwork/${id}`).then(r => setComments(r.data))
  }

  function loadRating() {
    return api.get(`/api/Comment/artwork/${id}/rating`).then(r => setRating(r.data))
  }

  function refresh() {
    return Promise.all([loadComments(), loadRating()])
  }

  useEffect(() => {
    Promise.all([
      api.get(`/api/Artwork/${id}`),
      api.get(`/api/Comment/artwork/${id}`),
      api.get(`/api/Comment/artwork/${id}/rating`),
    ])
      .then(([artRes, commRes, rateRes]) => {
        setArtwork(artRes.data)
        setComments(commRes.data)
        setRating(rateRes.data)
      })
      .catch(err => {
        setError(err.response?.status === 404 ? 'Artwork not found.' : 'Could not load artwork.')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleReviewSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      await api.post('/api/Comment', {
        content: newReview.content,
        rating: Number(newReview.rating),
        artworkId: id,
        artistId: artwork?.artistId,
      })
      await refresh()
      setNewReview({ content: '', rating: 5 })
    } catch (err) {
      const msg = err.response?.data
      setSubmitError(typeof msg === 'string' ? msg : 'Failed to post review.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReplySubmit(e, parentId) {
    e.preventDefault()
    setRowError('')
    try {
      await api.post('/api/Comment', {
        content: replyContent,
        artworkId: id,
        artistId: artwork?.artistId,
        parentId,
      })
      setReplyingTo(null)
      setReplyContent('')
      await refresh()
    } catch (err) {
      const msg = err.response?.data
      setRowError(typeof msg === 'string' ? msg : 'Failed to post reply.')
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setRowError('')
    try {
      const body = { content: editing.content }
      if (!editing.isReply) body.rating = Number(editing.rating)
      await api.put(`/api/Comment/${editing.id}`, body)
      setEditing(null)
      await refresh()
    } catch (err) {
      const msg = err.response?.data
      setRowError(typeof msg === 'string' ? msg : 'Failed to save changes.')
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm('Delete this comment? Replies will be removed too.')) return
    setRowError('')
    try {
      await api.delete(`/api/Comment/${commentId}`)
      await refresh()
    } catch (err) {
      const msg = err.response?.data
      setRowError(typeof msg === 'string' ? msg : 'Failed to delete.')
    }
  }

  if (loading) return <p className="loading-text">Loading…</p>
  if (error) return (
    <div>
      <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
      <Link to="/">← Back to artworks</Link>
    </div>
  )

  const isOwner = c => user && user.id === c.userId

  function renderTimestamps(c) {
    return (
      <p style={{ fontSize: '0.75rem', color: '#6E6785', marginTop: '0.4rem' }}>
        Created {new Date(c.createdAt).toLocaleString()}
        {c.updatedAt && (
          <span style={{ color: '#8B6CFF' }}> · edited {new Date(c.updatedAt).toLocaleString()}</span>
        )}
      </p>
    )
  }

  function renderActions(c, isReply) {
    if (!isOwner(c)) return null
    return (
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setRowError('')
            setEditing({ id: c.id, content: c.content, rating: c.rating ?? 5, isReply })
          }}
        >
          Edit
        </button>
        <button type="button" className="link-button" onClick={() => handleDelete(c.id)}>
          Delete
        </button>
      </div>
    )
  }

  function renderEditForm() {
    return (
      <form onSubmit={handleEditSubmit} className="form-stack" style={{ marginTop: '0.5rem' }}>
        <textarea
          value={editing.content}
          onChange={e => setEditing({ ...editing, content: e.target.value })}
          rows={3}
          required
          style={{ resize: 'vertical' }}
        />
        {!editing.isReply && (
          <select
            value={editing.rating}
            onChange={e => setEditing({ ...editing, rating: e.target.value })}
            style={{ width: 'auto' }}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        )}
        {rowError && <p className="error-text">{rowError}</p>}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="submit" className="btn-primary">Save</button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: '0.875rem', color: '#6E6785' }}>
        ← Back to artworks
      </Link>

      <div style={{ marginTop: '1.4rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>{artwork.title}</h1>
          {rating.ratingCount > 0 && (
            <StarRating value={rating.averageRating} count={rating.ratingCount} size={18} />
          )}
        </div>
        <p style={{ color: '#6E6785', fontSize: '0.875rem' }}>
          by <Link to={`/artists/${artwork.artistUsername}`} style={{ color: '#5B3FD6', fontWeight: 600, textDecoration: 'none' }}>{artwork.artistUsername}</Link>
          {artwork.category && <>{' · '}{artwork.category}</>}
          {' · '}{new Date(artwork.createdAt).toLocaleDateString()}
        </p>
      </div>

      {artwork.imageUrl && (
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          style={{
            maxWidth: '100%',
            maxHeight: 440,
            borderRadius: 12,
            marginBottom: '1.5rem',
            objectFit: 'cover',
            display: 'block',
            border: '1px solid #DDD6F7',
          }}
          onError={e => { e.target.style.display = 'none' }}
        />
      )}

      {artwork.description && (
        <p style={{ marginBottom: '2rem', lineHeight: 1.7, color: '#1F1B2D', fontSize: '0.95rem' }}>
          {artwork.description}
        </p>
      )}

      {/* Commission request — the component renders only for logged-in non-artists */}
      <CommissionRequest
        artistId={artwork.artistId}
        artistUsername={artwork.artistUsername}
        artworkId={id}
      />

      <h2 style={{
        fontSize: '1.1rem',
        marginBottom: '1.1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #DDD6F7',
        color: '#1F1B2D',
      }}>
        Reviews{comments.length > 0 && (
          <span style={{ fontWeight: 400, color: '#6E6785', marginLeft: '0.4rem' }}>
            ({comments.length})
          </span>
        )}
      </h2>

      {comments.length === 0 ? (
        <p className="muted" style={{ marginBottom: '1.75rem' }}>No reviews yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '2rem' }}>
          {comments.map(c => (
            <div key={c.id} style={{
              background: '#fff',
              border: '1px solid #DDD6F7',
              borderRadius: 10,
              padding: '0.9rem 1.1rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.35rem',
              }}>
                <Link to={`/users/${c.username}`} style={{ fontSize: '0.875rem', color: '#1F1B2D', fontWeight: 700, textDecoration: 'none' }}>{c.username}</Link>
                {c.rating != null && <StarRating value={c.rating} size={15} showValue={false} />}
              </div>

              {editing?.id === c.id ? (
                renderEditForm()
              ) : (
                <>
                  <p style={{ color: '#1F1B2D', fontSize: '0.9rem', lineHeight: 1.55 }}>{c.content}</p>
                  {renderTimestamps(c)}
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    {token && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setRowError('')
                          setReplyContent('')
                          setReplyingTo(replyingTo === c.id ? null : c.id)
                        }}
                      >
                        Reply
                      </button>
                    )}
                    {renderActions(c, false)}
                  </div>
                </>
              )}

              {/* Reply form */}
              {replyingTo === c.id && (
                <form
                  onSubmit={e => handleReplySubmit(e, c.id)}
                  className="form-stack"
                  style={{ marginTop: '0.7rem' }}
                >
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    rows={2}
                    placeholder="Write a reply…"
                    required
                    style={{ resize: 'vertical' }}
                  />
                  {rowError && <p className="error-text">{rowError}</p>}
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button type="submit" className="btn-primary">Reply</button>
                    <button type="button" className="btn-secondary" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Nested replies */}
              {c.replies?.length > 0 && (
                <div style={{
                  marginTop: '0.8rem',
                  paddingLeft: '1rem',
                  borderLeft: '2px solid #EDE8FB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}>
                  {c.replies.map(r => (
                    <div key={r.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Link to={`/users/${r.username}`} style={{ fontSize: '0.85rem', color: '#1F1B2D', fontWeight: 700, textDecoration: 'none' }}>{r.username}</Link>
                        {r.userId === artwork.artistId && (
                          <span style={{
                            background: '#5B3FD6',
                            color: '#fff',
                            borderRadius: 99,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.5rem',
                            letterSpacing: '0.03em',
                          }}>
                            Creator
                          </span>
                        )}
                      </div>
                      {editing?.id === r.id ? (
                        renderEditForm()
                      ) : (
                        <>
                          <p style={{ color: '#1F1B2D', fontSize: '0.88rem', lineHeight: 1.5 }}>{r.content}</p>
                          {renderTimestamps(r)}
                          {renderActions(r, true)}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parent review form */}
      {token ? (
        isArtworkArtist ? (
          <p className="muted" style={{ borderTop: '1px solid #DDD6F7', paddingTop: '1.1rem' }}>
            You can't review your own artwork, but you can reply to reviews above.
          </p>
        ) : hasReviewed ? (
          <p className="muted" style={{ borderTop: '1px solid #DDD6F7', paddingTop: '1.1rem' }}>
            You've already reviewed this artwork. You can edit your review above.
          </p>
        ) : (
          <div style={{ borderTop: '1px solid #DDD6F7', paddingTop: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.1rem', color: '#1F1B2D' }}>Leave a review</h3>
            <form onSubmit={handleReviewSubmit} className="form-stack" style={{ maxWidth: 520 }}>
              <div>
                <label className="field-label">Review</label>
                <textarea
                  value={newReview.content}
                  onChange={e => setNewReview({ ...newReview, content: e.target.value })}
                  rows={3}
                  placeholder="Share your thoughts…"
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="field-label">Rating</label>
                <select
                  value={newReview.rating}
                  onChange={e => setNewReview({ ...newReview, rating: e.target.value })}
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
                  {submitting ? 'Posting…' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        )
      ) : (
        <p className="muted" style={{ borderTop: '1px solid #DDD6F7', paddingTop: '1.1rem' }}>
          <Link to="/login">Log in</Link> to leave a review.
        </p>
      )}
    </div>
  )
}
