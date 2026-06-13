import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import StarRating from '../components/StarRating'

const cardStyle = { background: '#fff', border: '1px solid #DDD6F7', borderRadius: 12, padding: '1.25rem 1.4rem', marginBottom: '1.25rem' }
const labelStyle = { fontSize: '0.72rem', color: '#6E6785', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }

export default function ReferenceDetailPage() {
  const { username, id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' })

  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const backLink = `/artists/${encodeURIComponent(username)}?tab=references`

  function load() {
    return api.get(`/api/Reference/${id}`).then(r => setItem(r.data))
  }

  useEffect(() => {
    load()
      .catch(err => setError(err.response?.status === 404 ? 'This reference art is not available.' : 'Could not load this item.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="loading-text">Loading…</p>
  if (error) return (
    <div>
      <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
      <Link to={backLink}>← Back to profile</Link>
    </div>
  )

  const isArtist = user?.id === item.artistId
  const isClient = user?.id === item.clientId
  const myHidden = isArtist ? item.hiddenByArtist : isClient ? item.hiddenByClient : false

  async function toggleHidden() {
    setActionError('')
    try {
      await api.post(`/api/Reference/${id}/${myHidden ? 'unhide' : 'hide'}`)
      await load()
    } catch {
      setActionError('Could not update visibility.')
    }
  }

  async function saveReview(e) {
    e.preventDefault()
    setActionError('')
    try {
      await api.put(`/api/Reference/${id}/review`, { rating: Number(reviewForm.rating), review: reviewForm.review })
      setEditing(false)
      await load()
    } catch (err) {
      const msg = err.response?.data
      setActionError(typeof msg === 'string' ? msg : 'Could not save review.')
    }
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      <Link to={backLink} style={{ fontSize: '0.875rem', color: '#6E6785' }}>← Back to {item.artistUsername}'s profile</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '1rem 0 0.4rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{item.title}</h1>
        <StarRating value={item.rating} size={18} />
      </div>
      <p style={{ color: '#6E6785', fontSize: '0.875rem', marginBottom: '1.4rem' }}>
        by <Link to={`/artists/${item.artistUsername}`} style={{ color: '#5B3FD6', fontWeight: 600, textDecoration: 'none' }}>{item.artistUsername}</Link>
        {' · for '}{item.clientUsername}
        {' · '}completed {new Date(item.completedAt).toLocaleDateString()}
      </p>

      {!item.isVisible && (
        <p style={{ ...cardStyle, background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', margin: '0 0 1.25rem' }}>
          🔒 This item is hidden from the public profile
          {item.hiddenByArtist && item.hiddenByClient ? ' by both parties' : item.hiddenByArtist ? ' by the artist' : ' by the client'}.
          Only you and the other party can see it.
        </p>
      )}

      {item.imageUrl && (
        <a href={item.imageUrl} target="_blank" rel="noreferrer">
          <img src={item.imageUrl} alt={item.title}
            style={{ width: '100%', maxHeight: 440, objectFit: 'cover', borderRadius: 12, marginBottom: '1.5rem', display: 'block', border: '1px solid #DDD6F7' }}
            onError={e => { e.target.style.display = 'none' }} />
        </a>
      )}

      {item.description && (
        <p style={{ marginBottom: '1.5rem', lineHeight: 1.7, color: '#1F1B2D', fontSize: '0.95rem' }}>{item.description}</p>
      )}

      {/* Deal facts */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <p style={labelStyle}>Budget</p>
            <p style={{ margin: 0, color: '#1F1B2D' }}>{item.budget != null ? `$${item.budget}` : '—'}</p>
          </div>
          <div>
            <p style={labelStyle}>Delivery time</p>
            <p style={{ margin: 0, color: '#1F1B2D' }}>{item.deliveryTime || '—'}</p>
          </div>
          <div>
            <p style={labelStyle}>Completed</p>
            <p style={{ margin: 0, color: '#1F1B2D' }}>{new Date(item.completedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Client review */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#1F1B2D' }}>Client review</h2>
          <StarRating value={item.rating} size={16} showValue={false} />
        </div>
        {editing ? (
          <form onSubmit={saveReview} className="form-stack">
            <textarea value={reviewForm.review} rows={3} required style={{ resize: 'vertical' }}
              onChange={e => setReviewForm({ ...reviewForm, review: e.target.value })} />
            <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: e.target.value })} style={{ width: 'auto' }}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <p style={{ margin: 0, color: '#1F1B2D', lineHeight: 1.6 }}>“{item.review}”</p>
            <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>— {item.clientUsername}</p>
            {isClient && (
              <button type="button" className="link-button" style={{ marginTop: '0.6rem' }}
                onClick={() => { setReviewForm({ rating: item.rating, review: item.review }); setEditing(true) }}>
                Edit my review
              </button>
            )}
          </>
        )}
      </div>

      {/* Visibility control for either party */}
      {(isArtist || isClient) && (
        <div style={cardStyle}>
          <p style={labelStyle}>Visibility</p>
          <p className="muted" style={{ margin: '0 0 0.7rem', fontSize: '0.85rem' }}>
            {myHidden
              ? 'You have hidden this from the public profile.'
              : 'This is visible on the public profile (unless the other party hides it).'}
          </p>
          <button className="btn-secondary" onClick={toggleHidden}>
            {myHidden ? 'Unhide' : 'Hide from profile'}
          </button>
          {actionError && <p className="error-text" style={{ marginTop: '0.6rem' }}>{actionError}</p>}
        </div>
      )}
    </div>
  )
}
