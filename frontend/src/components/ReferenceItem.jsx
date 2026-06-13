import { Link } from 'react-router-dom'
import StarRating from './StarRating'

// Card for a completed-commission "reference art". Links to the reference detail page
// under the artist's profile. `showArtist` adds the artist name (omit on that artist's
// own profile, where it's redundant).
export default function ReferenceItem({ reference: r, showArtist = true }) {
  return (
    <Link
      to={`/artists/${encodeURIComponent(r.artistUsername)}/references/${r.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ background: '#fff', border: '1px solid #DDD6F7', borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 150, background: '#F3EEFF' }}>
          {r.imageUrl && (
            <img src={r.imageUrl} alt={r.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }} />
          )}
        </div>
        <div style={{ padding: '0.8rem 0.95rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <strong style={{ color: '#1F1B2D', fontSize: '0.95rem' }}>{r.title}</strong>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            {showArtist ? `by ${r.artistUsername} · ` : ''}for {r.clientUsername}
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
            <StarRating value={r.rating} size={14} />
            {r.budget != null && <span className="muted" style={{ fontSize: '0.8rem' }}>${r.budget}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
