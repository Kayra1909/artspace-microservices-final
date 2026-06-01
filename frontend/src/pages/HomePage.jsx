import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div style={{ maxWidth: 620, paddingTop: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>ArtSpace</h1>
      <p style={{ fontSize: '1.05rem', color: '#374151', lineHeight: 1.7, marginBottom: '0.5rem' }}>
        A platform for artists and art enthusiasts to share and discover artworks.
      </p>
      <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.75rem' }}>
        Artists can upload their works, visitors can browse and leave comments and ratings.
        Notifications are sent when someone interacts with your artwork.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <Link to="/artworks" className="btn-primary" style={{ textDecoration: 'none' }}>
          Browse Artworks
        </Link>
        <Link
          to="/register"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.25rem',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            color: '#374151',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          Create Account
        </Link>
      </div>

      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        fontSize: '0.875rem',
        color: '#64748b',
        lineHeight: 1.7,
      }}>
        <p><strong style={{ color: '#374151' }}>Architecture:</strong> Auth · Art · Comment · Notification services behind an Ocelot API Gateway.</p>
        <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
          Commission Service is planned for a future release and is not yet implemented.
        </p>
      </div>
    </div>
  )
}
