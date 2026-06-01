import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    role: 'Visitor',
    bio: '',
    contactEmail: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/Auth/register', form)
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data
      setError(typeof msg === 'string' ? msg : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Create Account</h1>
      <p className="muted" style={{ marginBottom: '1.75rem' }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>

      <form onSubmit={handleSubmit} className="form-stack">
        <div>
          <label className="field-label">Username</label>
          <input type="text" value={form.username} onChange={set('username')} placeholder="e.g. janedoe" required autoFocus />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" required />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
        </div>
        <div>
          <label className="field-label">Role</label>
          <select value={form.role} onChange={set('role')}>
            <option value="Visitor">Visitor — browse and comment on artworks</option>
            <option value="Artist">Artist — upload and manage artworks</option>
          </select>
        </div>
        <div>
          <label className="field-label">
            Bio <span className="muted">(optional)</span>
          </label>
          <input type="text" value={form.bio} onChange={set('bio')} placeholder="A short description about you" />
        </div>
        <div>
          <label className="field-label">
            Contact Email <span className="muted">(optional)</span>
          </label>
          <input type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="contact@example.com" />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
