import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/Artwork')
      .then(({ data }) => setArtworks(data))
      .catch(() => setError('Failed to load artworks. Make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">Loading artworks…</p>
  if (error) return <p className="error-text">{error}</p>

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Artworks</h1>
      {artworks.length === 0 ? (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '0.5rem' }}>No artworks yet.</p>
          <p className="muted">Artists can upload works via the API. Login as an Artist to create artworks.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {artworks.map(art => (
            <Link
              to={`/artworks/${art.id}`}
              key={art.id}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="card"
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {art.imageUrl ? (
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    style={{ width: '100%', height: 180, objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 180,
                    background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: '0.875rem',
                  }}>
                    No image
                  </div>
                )}
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>{art.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    by {art.artistUsername} · {art.category}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.4 }}>
                    {art.description?.length > 100 ? art.description.slice(0, 100) + '…' : art.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
