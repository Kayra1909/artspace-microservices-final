import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
          setError('Session expired. Please login again.')
        } else {
          setError('Failed to load notifications.')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  async function markRead(id) {
    try {
      await api.put(`/api/Notification/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
    } catch {
      // silently ignore mark-read failures
    }
  }

  if (!token) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="muted">Please <Link to="/login">login</Link> to view your notifications.</p>
      </div>
    )
  }

  if (loading) return <p className="muted">Loading notifications…</p>

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="error-text">{error}</p>
        <Link to="/login">Go to login</Link>
      </div>
    )
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Notifications</h1>
      {unread > 0 && (
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          {unread} unread notification{unread > 1 ? 's' : ''}
        </p>
      )}

      {notifications.length === 0 ? (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 10, padding: '2.5rem', textAlign: 'center',
        }}>
          <p style={{ color: '#64748b' }}>No notifications yet.</p>
          <p className="muted">You will be notified when someone comments on your artwork.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                background: n.isRead ? '#fff' : '#eff6ff',
                border: `1px solid ${n.isRead ? '#e2e8f0' : '#bfdbfe'}`,
                borderRadius: 8,
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{ flex: 1 }}>
                {!n.isRead && (
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    marginRight: 8,
                    verticalAlign: 'middle',
                  }} />
                )}
                <span style={{ color: '#1e293b', fontSize: '0.9rem' }}>{n.message}</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  style={{
                    background: '#10b981', color: '#fff',
                    border: 'none', borderRadius: 6,
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.8rem', cursor: 'pointer',
                    whiteSpace: 'nowrap',
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
