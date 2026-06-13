import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'

export default function RequestsPage() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  // Only artists can receive commission requests; clients (Visitors) only ever
  // send them, so they get a single "sent" list with no tabs.
  const isArtist = user?.role === 'Artist'
  const [tab, setTab] = useState(isArtist ? 'received' : 'sent')
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Tells a session failure (offer re-login) apart from a service outage (the
  // user is logged in fine — the RequestService is just unreachable).
  const [sessionExpired, setSessionExpired] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([
      isArtist
        ? api.get('/api/Request/received').then(r => setReceived(r.data))
        : Promise.resolve(),
      api.get('/api/Request/sent').then(r => setSent(r.data)),
    ])
      .catch(err => {
        if (err.response?.status === 401) {
          setSessionExpired(true)
          setError('Your session has expired. Please log in again.')
        } else {
          setSessionExpired(false)
          setError('The request service is unavailable right now. Please try again later.')
        }
      })
      .finally(() => setLoading(false))
  }, [token, isArtist])

  if (!token) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Artwork Requests</h1>
        <p className="muted">Please <Link to="/login">log in</Link> to view your requests.</p>
      </div>
    )
  }

  if (loading) return <p className="loading-text">Loading requests…</p>
  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Artwork Requests</h1>
        <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
        {sessionExpired && <Link to="/login">Go to login</Link>}
      </div>
    )
  }

  const list = tab === 'received' ? received : sent

  function tabStyle(active) {
    return {
      background: 'none',
      border: 'none',
      borderBottom: active ? '2px solid #5B3FD6' : '2px solid transparent',
      color: active ? '#1F1B2D' : '#6E6785',
      fontWeight: active ? 600 : 400,
      fontSize: '0.95rem',
      padding: '0.5rem 0.25rem',
      cursor: 'pointer',
      fontFamily: 'inherit',
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Artwork Requests</h1>

      {isArtist && (
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #DDD6F7', marginBottom: '1.5rem' }}>
          <button style={tabStyle(tab === 'received')} onClick={() => setTab('received')}>
            Received ({received.length})
          </button>
          <button style={tabStyle(tab === 'sent')} onClick={() => setTab('sent')}>
            Sent ({sent.length})
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">
            {tab === 'received' ? 'No requests received yet.' : 'You haven\'t sent any requests yet.'}
          </p>
          <p className="empty-sub">
            {tab === 'received'
              ? 'When someone requests a commission from you, it will appear here.'
              : 'Open an artwork and request a commission from its artist.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {list.map(r => (
            <Link key={r.id} to={`/requests/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: '#fff',
                border: '1px solid #DDD6F7',
                borderRadius: 10,
                padding: '0.95rem 1.1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: '#1F1B2D', fontSize: '0.95rem' }}>{r.title}</strong>
                  <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
                    {tab === 'received' ? `from ${r.requesterUsername}` : `to ${r.artistUsername}`}
                    {' · '}{new Date(r.createdAt).toLocaleDateString()}
                    {(r.agreedPrice ?? r.proposedPrice) != null && <> · ${r.agreedPrice ?? r.proposedPrice}</>}
                  </p>
                </div>
                <StatusBadge state={r.state} progressMode={r.progressMode} viewerRole={tab === 'received' ? 'artist' : 'client'} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
