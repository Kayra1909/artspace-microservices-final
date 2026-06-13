import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import ArtworkItem from './ArtworkItem'
import ReferenceItem from '../components/ReferenceItem'

const CATEGORIES = [
  'Painting', 'Drawing', 'Digital Art', 'Photography',
  'Sculpture', 'Illustration', 'Mixed Media', 'Other',
]

const emptyForm = { title: '', description: '', imageUrl: '', category: '' }

export default function HomePage() {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState([])
  const [references, setReferences] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [newArt, setNewArt] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isArtist = user?.role === 'Artist'
  const isLoggedIn = !!user

  function buildUrl(kw, cat) {
    const params = new URLSearchParams()
    if (kw.trim()) params.append('keyword', kw.trim())
    if (cat) params.append('category', cat)
    const qs = params.toString()
    return `/api/Artwork${qs ? '?' + qs : ''}`
  }

  function loadRatings(items) {
    const ids = items.map(a => a.id)
    if (ids.length === 0) {
      setRatings({})
      return Promise.resolve()
    }
    return api.get(`/api/Comment/ratings?artworkIds=${ids.join(',')}`)
      .then(({ data }) => {
        const map = {}
        for (const r of data) map[r.artworkId] = r
        setRatings(map)
      })
      .catch(() => { /* ratings are non-critical; ignore failures */ })
  }

  function loadArtworks(kw = '', cat = '') {
    return api.get(buildUrl(kw, cat))
      .then(({ data }) => {
        setArtworks(data)
        return loadRatings(data)
      })
      .catch(() => setFetchError('Could not load artworks. Make sure the backend is running.'))
  }

  useEffect(() => {
    loadArtworks().finally(() => setLoading(false))
    // Completed-commission reference arts shown alongside the artworks.
    api.get('/api/Reference').then(({ data }) => setReferences(data)).catch(() => { /* non-critical */ })
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    loadArtworks(keyword, selectedCategory)
  }

  function clearSearch() {
    setKeyword('')
    setSelectedCategory('')
    loadArtworks('', '')
  }

  const isFiltered = keyword.trim() !== '' || selectedCategory !== ''

  function setField(field) {
    return e => setNewArt(prev => ({ ...prev, [field]: e.target.value }))
  }

  function openForm() {
    setShowForm(true)
    setCreateError('')
    setSuccessMsg('')
  }

  function closeForm() {
    setShowForm(false)
    setCreateError('')
    setNewArt(emptyForm)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      await api.post('/api/Artwork', newArt)
      await loadArtworks()
      setNewArt(emptyForm)
      setShowForm(false)
      setSuccessMsg('Artwork created successfully.')
    } catch (err) {
      const msg = err.response?.data
      setCreateError(typeof msg === 'string' ? msg : 'Failed to create artwork.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {/* Hero / intro */}
      {!isLoggedIn &&
        <div style={{ maxWidth: 952, margin: '0 auto', paddingTop: '1.5rem' }}>
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

            {!isLoggedIn && (
              <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn-secondary">
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      }
      {/* Artworks (moved here from the former Artworks page) */}
      {loading ? (
        <p className="loading-text">Loading artworks…</p>
      ) : fetchError ? (
        <p className="error-text">{fetchError}</p>
      ) : (
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Artworks</h2>
            {isArtist && !showForm && (
              <button className="btn-primary" onClick={openForm} style={{ marginLeft: 'auto' }}>
                Upload Artwork
              </button>
            )}
          </div>

          {/* Search / filter bar */}
          {!showForm && (
            <form
              onSubmit={handleSearch}
              style={{
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'stretch',
                marginBottom: '1.75rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Search by title, description or category…"
                style={{ flex: '1 1 220px', minWidth: 0 }}
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ flex: '0 0 auto', width: 'auto' }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" style={{ flex: '0 0 auto' }}>
                Search
              </button>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="btn-secondary"
                  style={{ flex: '0 0 auto' }}
                >
                  Clear
                </button>
              )}
            </form>
          )}

          {/* Success banner */}
          {successMsg && (
            <p className="success-text" style={{ maxWidth: 520, margin: '0 auto 1.75rem' }}>
              {successMsg}
            </p>
          )}

          {/* Create form */}
          {isArtist && showForm && (
            <div style={{
              maxWidth: 520,
              margin: '0 auto 2.25rem',
              background: '#fff',
              border: '1px solid #DDD6F7',
              borderRadius: 14,
              padding: '1.75rem 2rem',
              boxShadow: '0 2px 20px rgba(91, 63, 214, 0.09)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.4rem',
              }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#1F1B2D' }}>New Artwork</h2>
                <button
                  onClick={closeForm}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6E6785', fontSize: '0.875rem', fontWeight: 500,
                    padding: '0.2rem 0.5rem', borderRadius: 6, fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreate} className="form-stack">
                <div>
                  <label className="field-label">Title</label>
                  <input
                    type="text"
                    value={newArt.title}
                    onChange={setField('title')}
                    placeholder="Artwork title"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Category</label>
                  <select value={newArt.category} onChange={setField('category')}>
                    <option value="">Select a category…</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">
                    Image URL <span className="muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newArt.imageUrl}
                    onChange={setField('imageUrl')}
                    placeholder="https://…"
                  />
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                    Paste an image link to preview the artwork.
                  </p>
                  {newArt.imageUrl && (
                    <img
                      src={newArt.imageUrl}
                      alt="Preview"
                      style={{
                        marginTop: '0.65rem', width: '100%', maxHeight: 180,
                        objectFit: 'cover', borderRadius: 8,
                        border: '1px solid #DDD6F7', display: 'block',
                      }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>
                <div>
                  <label className="field-label">
                    Description <span className="muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newArt.description}
                    onChange={setField('description')}
                    placeholder="A short description"
                  />
                </div>

                {createError && <p className="error-text">{createError}</p>}

                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.25rem', textAlign: 'center' }}
                >
                  {creating ? 'Creating…' : 'Create Artwork'}
                </button>
              </form>
            </div>
          )}

          {/* Filtered results label */}
          {isFiltered && artworks.length > 0 && (
            <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              {artworks.length} result{artworks.length !== 1 ? 's' : ''}
              {keyword.trim() && <> for <strong>"{keyword.trim()}"</strong></>}
              {selectedCategory && <> in <strong>{selectedCategory}</strong></>}
            </p>
          )}

          {/* Empty state — role- and filter-aware */}
          {artworks.length === 0 && (
            <div className="empty-state">
              <p className="empty-title">
                {isFiltered
                  ? 'No artworks found for this search or category.'
                  : 'No artworks have been shared yet.'}
              </p>
              <p className="empty-sub">
                {isFiltered
                  ? 'Try a different keyword or select another category.'
                  : isArtist
                    ? 'Click "Upload Artwork" above to share your first work.'
                    : isLoggedIn
                      ? 'Check back later for new works.'
                      : 'Log in to browse and comment on artworks.'}
              </p>
            </div>
          )}

          {/* Artwork grid */}
          {artworks.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}>
              {artworks.map(art => (
                <ArtworkItem showRating key={art.id} art={art} navigate={navigate} rating={ratings[art.id]} />
              ))}
            </div>
          )}

          {/* Reference arts — completed commissions, shown alongside the artworks (not while
              searching/filtering artworks or uploading). */}
          {!showForm && !isFiltered && references.length > 0 && (
            <div style={{ marginTop: '2.75rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.3rem' }}>Reference Arts</h2>
              <p className="muted" style={{ margin: '0 0 1.2rem', fontSize: '0.85rem' }}>
                Completed commissions, with the client's review.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}>
                {references.map(r => (
                  <ReferenceItem key={r.id} reference={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
