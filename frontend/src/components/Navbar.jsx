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

  function navLink(path) {
    const active = location.pathname.startsWith(path)
    return {
      color: active ? '#fff' : 'rgba(255,255,255,0.65)',
      fontWeight: active ? '600' : '400',
      textDecoration: 'none',
      fontSize: '0.9rem',
      paddingBottom: '2px',
      borderBottom: active ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
    }
  }

  return (
    <nav style={{
      background: '#0f172a',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
      height: 52,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}>
      <Link to="/" style={{
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.05rem',
        textDecoration: 'none',
        marginRight: 'auto',
        letterSpacing: '0.01em',
      }}>
        ArtSpace
      </Link>

      <Link to="/artworks" style={navLink('/artworks')}>Artworks</Link>

      {token && (
        <Link to="/notifications" style={navLink('/notifications')}>Notifications</Link>
      )}

      {token ? (
        <>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.825rem' }}>
            {user?.username}
          </span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'rgba(255,255,255,0.75)',
              padding: '0.3rem 0.8rem',
              fontSize: '0.825rem',
              borderRadius: 5,
              cursor: 'pointer',
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
