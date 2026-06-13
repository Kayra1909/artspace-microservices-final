import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Avatar from '../components/Avatar'
import CommissionRequest from '../components/CommissionRequest'
import ReferenceItem from '../components/ReferenceItem'
import ArtworkItem from './ArtworkItem'

const PAGE_SIZE = 12

export default function ProfilePage() {
  const { username } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // The active tab is driven by ?tab= (artworks | references); artworks is the default.
  const activeTab = searchParams.get('tab') === 'references' ? 'references' : 'artworks'
  const selectTab = key => setSearchParams(key === 'artworks' ? {} : { tab: key }, { replace: true })

  // Paginated artworks for the Artworks tab.
  const [page, setPage] = useState(1)
  const [gallery, setGallery] = useState({ items: [], total: 0, totalPages: 0 })
  const [galleryLoading, setGalleryLoading] = useState(false)

  // Completed reference artworks (the artist's finished commissions) for the References tab.
  const [references, setReferences] = useState([])
  const [referencesLoading, setReferencesLoading] = useState(false)

  // Inline self-edit.
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const isOwnProfile = currentUser && profile && currentUser.id === profile.id
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ bio: '', contactEmail: '', profilePictureUrl: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isArtist = profile?.role === 'Artist'

  // Load the profile whenever the username in the URL changes.
  useEffect(() => {
    setLoading(true)
    setError('')
    setProfile(null)
    setPage(1)
    api.get(`/api/Auth/profile/by-username/${encodeURIComponent(username)}`)
      .then(({ data }) => setProfile(data))
      .catch(err => setError(err.response?.status === 404 ? 'Profile not found.' : 'Could not load profile.'))
      .finally(() => setLoading(false))
  }, [username])

  // Load a page of the artist's artworks when on the Artworks tab.
  useEffect(() => {
    if (!profile || !isArtist || activeTab !== 'artworks') return
    setGalleryLoading(true)
    api.get(`/api/Artwork/artist/${profile.id}/paged?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(({ data }) => setGallery(data))
      .catch(() => setGallery({ items: [], total: 0, totalPages: 0 }))
      .finally(() => setGalleryLoading(false))
  }, [profile, isArtist, activeTab, page])

  // Load this artist's completed reference artworks when on the References tab.
  useEffect(() => {
    if (!profile || !isArtist || activeTab !== 'references') return
    setReferencesLoading(true)
    api.get('/api/Reference')
      .then(({ data }) => setReferences(data.filter(r => r.artistId === profile.id)))
      .catch(() => setReferences([]))
      .finally(() => setReferencesLoading(false))
  }, [profile, isArtist, activeTab])

  function openEdit() {
    setForm({
      bio: profile.bio || '',
      contactEmail: profile.contactEmail || '',
      profilePictureUrl: profile.profilePictureUrl || '',
    })
    setSaveError('')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      const { data } = await api.put('/api/Auth/profile', {
        bio: form.bio,
        contactEmail: form.contactEmail,
        profilePictureUrl: form.profilePictureUrl,
      })
      setProfile(p => ({
        ...p,
        bio: data.bio,
        contactEmail: data.contactEmail,
        profilePictureUrl: data.profilePictureUrl,
      }))
      // Keep the cached user picture in sync so the navbar/avatar update too.
      const stored = JSON.parse(localStorage.getItem('user') || 'null')
      if (stored && stored.id === data.id) {
        localStorage.setItem('user', JSON.stringify({ ...stored, profilePictureUrl: data.profilePictureUrl }))
      }
      setEditing(false)
    } catch (err) {
      const msg = err.response?.data
      setSaveError(typeof msg === 'string' ? msg : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="loading-text">Loading profile…</p>
  if (error) return (
    <div>
      <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
      <Link to="/">← Back to artworks</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Profile header */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'flex-start',
        background: '#fff',
        border: '1px solid #DDD6F7',
        borderRadius: 16,
        padding: '1.75rem 2rem',
        boxShadow: '0 2px 20px rgba(91, 63, 214, 0.07)',
      }}>
        <Avatar src={profile.profilePictureUrl} username={profile.username} size={96} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', margin: 0, color: '#1F1B2D' }}>{profile.username}</h1>
            <span style={{
              background: isArtist ? '#5B3FD6' : '#F3EEFF',
              color: isArtist ? '#fff' : '#5B3FD6',
              border: '1px solid #DDD6F7',
              borderRadius: 99,
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.18rem 0.7rem',
              letterSpacing: '0.02em',
            }}>
              {isArtist ? 'Artist' : 'Member'}
            </span>
            {isOwnProfile && !editing && (
              <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={openEdit}>
                Edit profile
              </button>
            )}
          </div>

          <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>

          {!editing && (
            <>
              {profile.bio
                ? <p style={{ marginTop: '0.85rem', lineHeight: 1.65, color: '#1F1B2D', fontSize: '0.95rem' }}>{profile.bio}</p>
                : <p className="muted" style={{ marginTop: '0.85rem', fontStyle: 'italic' }}>No bio yet.</p>}
              {profile.contactEmail && (
                <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  Contact: <a href={`mailto:${profile.contactEmail}`} style={{ color: '#5B3FD6' }}>{profile.contactEmail}</a>
                </p>
              )}
            </>
          )}

          {editing && (
            <form onSubmit={handleSave} className="form-stack" style={{ marginTop: '1rem' }}>
              <div>
                <label className="field-label">Profile picture URL</label>
                <input
                  type="text"
                  value={form.profilePictureUrl}
                  onChange={e => setForm({ ...form, profilePictureUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="field-label">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  placeholder="Tell visitors about yourself…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="field-label">Contact email <span className="muted">(public)</span></label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              {saveError && <p className="error-text">{saveError}</p>}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Commission an artist directly from their profile (renders only for
          logged-in visitors who aren't this artist). */}
      {isArtist && (
        <CommissionRequest
          artistId={profile.id}
          artistUsername={profile.username}
          style={{ marginTop: '1.5rem' }}
        />
      )}

      {/* Artists get a tabbed portfolio; regular members just see the header. */}
      {isArtist && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #DDD6F7', marginBottom: '1.5rem' }}>
            {[
              { key: 'artworks', label: 'Artworks' },
              { key: 'references', label: 'Reference Arts' },
            ].map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#5B3FD6' : '#6E6785',
                    padding: '0.6rem 1rem',
                    borderBottom: active ? '2px solid #5B3FD6' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'artworks' && (
            <ArtworksTab
              gallery={gallery}
              loading={galleryLoading}
              page={page}
              setPage={setPage}
              username={profile.username}
            />
          )}

          {activeTab === 'references' && (
            <ReferencesTab
              references={references}
              loading={referencesLoading}
              username={profile.username}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ArtworksTab({ gallery, loading, page, setPage, username }) {
  if (loading) return <p className="loading-text">Loading artworks…</p>

  if (gallery.items.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">{username} hasn't shared any artworks yet.</p>
        <p className="empty-sub">Check back later for new works.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1.1rem',
      }}>
        {gallery.items.map(art => (
          <ArtworkItem art={art} />
        ))}
      </div>

      {/* Pagination */}
      {gallery.totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '1.75rem',
        }}>
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ opacity: page <= 1 ? 0.5 : 1 }}
          >
            ← Prev
          </button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Page {page} of {gallery.totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= gallery.totalPages}
            onClick={() => setPage(p => Math.min(gallery.totalPages, p + 1))}
            style={{ opacity: page >= gallery.totalPages ? 0.5 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function ReferencesTab({ references, loading, username }) {
  if (loading) return <p className="loading-text">Loading reference arts…</p>

  if (references.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">{username} has no completed commissions yet.</p>
        <p className="empty-sub">Accepted commission deliveries appear here as reference arts.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.1rem' }}>
      {references.map(r => (
        <ReferenceItem key={r.id} reference={r} showArtist={false} />
      ))}
    </div>
  )
}
