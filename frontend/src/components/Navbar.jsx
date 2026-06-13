import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api/client'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [unread, setUnread] = useState(0)

  // Keep the Notifications badge in sync: refetch on navigation, on a light poll,
  // and whenever the Notifications page tells us it changed something (mark read).
  useEffect(() => {
    // No token → the Notifications link (and its badge) isn't rendered, so there's
    // nothing to count. Any stale value stays harmlessly hidden until next login.
    if (!token) return
    let cancelled = false
    const load = () => api.get('/api/Notification')
      .then(({ data }) => { if (!cancelled) setUnread(data.filter(n => !n.isRead).length) })
      .catch(() => { /* keep the last known count */ })

    load()
    const onUpdate = () => load()
    window.addEventListener('notifications-updated', onUpdate)
    const interval = setInterval(load, 45000)
    return () => {
      cancelled = true
      window.removeEventListener('notifications-updated', onUpdate)
      clearInterval(interval)
    }
  }, [token, location.pathname])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  function isActive(path) {
    return location.pathname.startsWith(path)
  }

  function navLink(path) {
    const active = isActive(path)
    return {
      color: active ? '#fff' : 'rgba(255,255,255,0.68)',
      fontWeight: active ? '600' : '400',
      textDecoration: 'none',
      fontSize: '0.9rem',
      paddingBottom: '2px',
      borderBottom: active ? '2px solid #8B6CFF' : '2px solid transparent',
      transition: 'color 0.15s, border-color 0.15s',
    }
  }

  return (
    <nav style={{
      background: '#1E1047',
      padding: '0 1.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.75rem',
      height: 54,
      boxShadow: '0 1px 0 rgba(139, 108, 255, 0.15), 0 2px 8px rgba(0,0,0,0.25)',
    }}>
      <Link to="/" style={{
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.08rem',
        textDecoration: 'none',
        marginRight: 'auto',
        letterSpacing: '0.02em',
      }}>
        ArtSpace
      </Link>

      {token && (
        <Link to="/requests" style={navLink('/requests')}>Requests</Link>
      )}

      {token && (
        <Link to="/notifications" style={{ ...navLink('/notifications'), display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          Notifications
          {unread > 0 && (
            <span style={{
              background: '#8B6CFF',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              lineHeight: 1,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 99,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      )}

      {token ? (
        <>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.82rem',
            fontWeight: 400,
          }}>
            Logged in as: <Link
              to={`/${user?.role === 'Artist' ? 'artists' : 'users'}/${user?.username}`}
              style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, textDecoration: 'none' }}
            >{user?.username}</Link>
          </span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(139, 108, 255, 0.4)',
              color: 'rgba(255,255,255,0.82)',
              padding: '0.28rem 0.85rem',
              fontSize: '0.825rem',
              borderRadius: 7,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = '#8B6CFF'
              e.target.style.background = 'rgba(139, 108, 255, 0.1)'
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = 'rgba(139, 108, 255, 0.4)'
              e.target.style.background = 'transparent'
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={navLink('/login')}>Login</Link>
          <Link to="/register" style={navLink('/register')}>Register</Link>
        </>
      )}
    </nav>
  )
}
