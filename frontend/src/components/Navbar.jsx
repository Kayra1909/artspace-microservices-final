import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  function activeStyle(path) {
    const active = location.pathname.startsWith(path)
    return {
      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
      fontWeight: active ? '600' : '400',
      textDecoration: 'none',
      fontSize: '0.95rem',
    }
  }

  return (
    <nav style={{
      background: '#1e293b',
      padding: '0.75rem 2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
    }}>
      <Link to="/artworks" style={{
        color: '#fff', fontWeight: 700, fontSize: '1.1rem',
        textDecoration: 'none', marginRight: 'auto',
      }}>
        ArtSpace
      </Link>

      <Link to="/artworks" style={activeStyle('/artworks')}>Artworks</Link>

      {token && (
        <Link to="/notifications" style={activeStyle('/notifications')}>
          Notifications
        </Link>
      )}

      {token ? (
        <>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>
            {user?.username}
          </span>
          <button onClick={logout} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff',
            padding: '0.3rem 0.8rem',
            fontSize: '0.875rem',
            borderRadius: 6,
            cursor: 'pointer',
          }}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={activeStyle('/login')}>Login</Link>
          <Link to="/register" style={activeStyle('/register')}>Register</Link>
        </>
      )}
    </nav>
  )
}
