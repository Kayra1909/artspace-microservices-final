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

      <Link to="/artworks" style={navLink('/artworks')}>Artworks</Link>

      {token && (
        <Link to="/notifications" style={navLink('/notifications')}>Notifications</Link>
      )}

      {token ? (
        <>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.82rem',
            fontWeight: 400,
          }}>
            Logged in as: <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{user?.username}</span>
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
