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
      .catch(() => setError('Could not load artworks. Make sure the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="loading-text">Loading artworks…</p>
  if (error) return <p className="error-text">{error}</p>

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Artworks</h1>

      {artworks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No artworks have been shared yet.</p>
          <p className="empty-sub">Artists can upload works through the API. Log in as an Artist to get started.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}>
          {artworks.map(art => (
            <Link
              to={`/artworks/${art.id}`}
              key={art.id}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card">
                {art.imageUrl ? (
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 180,
                    background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: '0.85rem',
                  }}>
                    No image
                  </div>
                )}
                <div style={{ padding: '0.9rem 1rem 1rem' }}>
                  <h3 style={{ fontSize: '0.975rem', marginBottom: '0.2rem' }}>{art.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    {art.artistUsername} · {art.category}
                  </p>
                  {art.description && (
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.45 }}>
                      {art.description.length > 90 ? art.description.slice(0, 90) + '…' : art.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
