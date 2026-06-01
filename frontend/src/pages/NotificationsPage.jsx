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
    } catch {
      // ignore
    }
  }

  if (!token) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="muted">Please <Link to="/login">log in</Link> to view your notifications.</p>
      </div>
    )
  }

  if (loading) return <p className="loading-text">Loading notifications…</p>

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Notifications</h1>
        <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
        <Link to="/login">Go to login</Link>
      </div>
    )
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Notifications</h1>
        {unread > 0 && (
          <span style={{
            background: '#2563eb', color: '#fff',
            fontSize: '0.75rem', fontWeight: 600,
            padding: '0.1rem 0.55rem', borderRadius: 99,
          }}>
            {unread} new
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No notifications yet.</p>
          <p className="empty-sub">You will be notified when someone comments on your artwork.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  {!n.isRead && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#2563eb', flexShrink: 0,
                      display: 'inline-block',
                    }} />
                  )}
                  <span style={{ color: '#1e293b', fontSize: '0.9rem' }}>{n.message}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    borderRadius: 5,
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
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
