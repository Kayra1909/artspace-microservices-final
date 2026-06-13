import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/Auth/login', form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      const msg = err.response?.data
      if (typeof msg === 'string' && msg.trim()) {
        setError(msg)
      } else if (!err.response || err.response.status >= 500) {
        // AuthService unreachable or 5xx (e.g. down → gateway 502 with empty
        // body). Don't blame the user's credentials for an outage.
        setError('The login service is unavailable right now. Please try again later.')
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>Welcome back</h1>
        <p className="muted">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-stack">
          <div>
            <label className="field-label">Account Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.25rem', textAlign: 'center' }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
