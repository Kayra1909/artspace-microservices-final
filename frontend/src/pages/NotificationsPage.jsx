import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

// Renders a notification message with clickable references woven in:
//   • the actor's name (first occurrence of `actorUsername`) → their profile
//   • the affected object, quoted in the message as "Title", → its page
//     (currently only LinkType "request" → /requests/:linkId)
// Anything we can't resolve falls back to plain text, so a message without
// link metadata renders exactly as before.
function NotificationMessage({ message, actorUsername, linkType, linkId }) {
  const objectHref = linkType === 'request' && linkId ? `/requests/${linkId}` : null

  // Build an ordered list of [start, end, element] spans to linkify, then stitch
  // the message together around them. We only link the first match of each so we
  // never double-wrap or mangle overlapping ranges.
  const spans = []

  if (actorUsername) {
    const i = message.indexOf(actorUsername)
    if (i !== -1) {
      spans.push({
        start: i,
        end: i + actorUsername.length,
        el: (
          <Link to={`/users/${encodeURIComponent(actorUsername)}`} style={linkStyle}>
            {actorUsername}
          </Link>
        ),
      })
    }
  }

  if (objectHref) {
    // The object title is the text inside the first pair of double quotes.
    const open = message.indexOf('"')
    const close = open !== -1 ? message.indexOf('"', open + 1) : -1
    if (open !== -1 && close !== -1) {
      spans.push({
        start: open,
        end: close + 1,
        el: (
          <Link to={objectHref} style={linkStyle}>
            {message.slice(open, close + 1)}
          </Link>
        ),
      })
    }
  }

  if (spans.length === 0) return <>{message}</>

  spans.sort((a, b) => a.start - b.start)

  const parts = []
  let cursor = 0
  spans.forEach((s, idx) => {
    if (s.start < cursor) return // skip any overlap
    if (s.start > cursor) parts.push(message.slice(cursor, s.start))
    parts.push(<span key={idx}>{s.el}</span>)
    cursor = s.end
  })
  if (cursor < message.length) parts.push(message.slice(cursor))

  return <>{parts}</>
}

const linkStyle = { color: '#5B3FD6', fontWeight: 600, textDecoration: 'none' }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/api/Notification')
      .then(({ data }) => setNotifications(data))
      .catch(err => {
        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.')
        } else {
          setError('Could not load notifications.')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  async function markRead(id) {
    try {
      await api.put(`/api/Notification/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      window.dispatchEvent(new Event('notifications-updated'))
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length === 0) return
    setMarkingAll(true)
    // Optimistically flip everything; the badge clears immediately even if a
    // stray request fails.
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    window.dispatchEvent(new Event('notifications-updated'))
    try {
      await Promise.all(unreadIds.map(id => api.put(`/api/Notification/${id}/read`)))
    } catch {
      // ignore — already reflected optimistically
    } finally {
      setMarkingAll(false)
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="muted">Please <Link to="/login">log in</Link> to view your notifications.</p>
      </div>
    )
  }

  if (loading) return <p className="loading-text">Loading notifications…</p>

  if (error) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
        <Link to="/login">Go to login</Link>
      </div>
    )
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Notifications</h1>
        {unread > 0 && (
          <span style={{
            background: '#5B3FD6',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.15rem 0.6rem',
            borderRadius: 99,
            letterSpacing: '0.02em',
          }}>
            {unread} new
          </span>
        )}
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #C4B5FD',
              color: '#5B3FD6',
              borderRadius: 7,
              padding: '0.3rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: markingAll ? 'default' : 'pointer',
              opacity: markingAll ? 0.6 : 1,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No notifications yet.</p>
          <p className="empty-sub">You will be notified when someone comments on your artwork.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                background: n.isRead ? '#fff' : '#F3EEFF',
                border: `1px solid ${n.isRead ? '#DDD6F7' : '#C4B5FD'}`,
                borderRadius: 10,
                padding: '0.9rem 1.1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                  {!n.isRead && (
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#5B3FD6',
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                  )}
                  <span style={{ color: '#1F1B2D', fontSize: '0.9rem' }}>
                    <NotificationMessage
                      message={n.message}
                      actorUsername={n.actorUsername}
                      linkType={n.linkType}
                      linkId={n.linkId}
                    />
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6E6785', paddingLeft: n.isRead ? 0 : '1rem' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #C4B5FD',
                    color: '#5B3FD6',
                    borderRadius: 7,
                    padding: '0.25rem 0.7rem',
                    fontSize: '0.775rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
