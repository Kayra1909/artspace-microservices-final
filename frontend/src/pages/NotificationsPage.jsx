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
                  <span style={{ color: '#1F1B2D', fontSize: '0.9rem' }}>{n.message}</span>
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
