import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.6rem', letterSpacing: '-0.01em' }}>
          ArtSpace
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#1F1B2D', lineHeight: 1.7, marginBottom: '0.5rem' }}>
          A platform for artists and art enthusiasts to share and discover artworks.
        </p>
        <p style={{ fontSize: '0.95rem', color: '#6E6785', lineHeight: 1.65, marginBottom: '2rem' }}>
          Artists upload their works, visitors browse and leave comments and ratings.
          Notifications are delivered when someone interacts with your artwork.
        </p>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Link to="/artworks" className="btn-primary">
            Browse Artworks
          </Link>
          <Link to="/register" className="btn-secondary">
            Create Account
          </Link>
        </div>
      </div>

      <div style={{
        background: '#F3EEFF',
        border: '1px solid #DDD6F7',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#1F1B2D', lineHeight: 1.7 }}>
          <strong>Architecture:</strong>{' '}
          <span style={{ color: '#5B3FD6' }}>Auth</span> ·{' '}
          <span style={{ color: '#5B3FD6' }}>Art</span> ·{' '}
          <span style={{ color: '#5B3FD6' }}>Comment</span> ·{' '}
          <span style={{ color: '#5B3FD6' }}>Notification</span>{' '}
          services behind an Ocelot API Gateway, backed by PostgreSQL and RabbitMQ, orchestrated with Docker Compose.
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6E6785' }}>
          Commission Service, Follow, Like/Save, and Similar Artwork features are planned for a future release.
        </p>
      </div>
    </div>
  )
}
