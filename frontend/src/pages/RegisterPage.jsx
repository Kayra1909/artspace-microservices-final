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
    <div style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Register</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label className="field-label">Username</label>
          <input type="text" value={form.username} onChange={set('username')} required autoFocus />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input type="password" value={form.password} onChange={set('password')} required />
        </div>
        <div>
          <label className="field-label">Role</label>
          <select value={form.role} onChange={set('role')}>
            <option value="Visitor">Visitor</option>
            <option value="Artist">Artist</option>
          </select>
        </div>
        <div>
          <label className="field-label">Bio <span className="muted">(optional)</span></label>
          <input type="text" value={form.bio} onChange={set('bio')} />
        </div>
        <div>
          <label className="field-label">Contact Email <span className="muted">(optional)</span></label>
          <input type="email" value={form.contactEmail} onChange={set('contactEmail')} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registering…' : 'Create account'}
        </button>
        <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}
