import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import NegotiationActions from '../components/NegotiationActions'
import DealTerm from '../components/DealTerm'

// Client-side mirror of δ — used ONLY to decide which buttons to show. The server's
// transition function is the sole authority; the UI is a hint (spec §Page display).
const LEGAL = {
  WaitingArtistReview: { artist: ['set_offer'], client: [] },
  NegotiationClient: { artist: [], client: ['accept_offer', 'counter_offer'] },
  NegotiationArtist: { artist: ['set_offer', 'accept_offer'], client: [] },
  WorkInProgress: { artist: ['submit_artwork'], client: [] },
  WaitingReviewClient: { artist: [], client: ['accept_artwork', 'request_revisions'] },
  Completed: { artist: [], client: [] },
  Cancelled: { artist: [], client: [] },
}

const ENDPOINT = {
  set_offer: 'offer',
  accept_offer: 'accept-offer',
  counter_offer: 'counter-offer',
  submit_artwork: 'submit-artwork',
  accept_artwork: 'accept-artwork',
  request_revisions: 'request-revisions',
  cancel: 'cancel',
}

const ACTION_LABEL = {
  submit_request: 'submitted the request',
  set_offer: 'made an offer',
  accept_offer: 'accepted the offer',
  counter_offer: 'sent a counter-offer',
  submit_artwork: 'submitted the artwork',
  accept_artwork: 'accepted the artwork',
  request_revisions: 'requested revisions',
  cancel: 'cancelled the request',
}

const labelStyle = { fontSize: '0.72rem', color: '#6E6785', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }
const cardStyle = { background: '#fff', border: '1px solid #DDD6F7', borderRadius: 12, padding: '1.25rem 1.4rem', marginBottom: '1.25rem' }

const IMAGE_URL_RE = /^https?:\/\/\S+$/i

// A bare URL (e.g. an artist's deliverable link) renders as an inline image preview with the
// link beneath; anything else renders as plain text.
function MessageContent({ content }) {
  if (IMAGE_URL_RE.test(content.trim())) {
    return (
      <a href={content} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
        <img src={content} alt="shared"
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', marginBottom: '0.3rem' }}
          onError={e => { e.target.style.display = 'none' }} />
        <span style={{ fontSize: '0.72rem', opacity: 0.85, wordBreak: 'break-all' }}>{content}</span>
      </a>
    )
  }
  return content
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')

  // Inline forms for payload-carrying actions.
  const [offer, setOffer] = useState({ price: '', deadline: '' })
  const [deliverable, setDeliverable] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [reviewPanel, setReviewPanel] = useState('none') // 'none' | 'accept' | 'revision'
  const [review, setReview] = useState({ content: '', rating: 5 })

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function load() {
    return api.get(`/api/Request/${id}`).then(r => setRequest(r.data))
  }

  useEffect(() => {
    if (!token) { setLoading(false); return }
    load()
      .catch(err => {
        if (err.response?.status === 404) setError('Request not found.')
        else if (err.response?.status === 403) setError('You do not have access to this request.')
        else setError('Could not load this request.')
      })
      .finally(() => setLoading(false))
  }, [id, token])

  if (!token) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p className="muted">Please <Link to="/login">log in</Link> to view this request.</p>
      </div>
    )
  }
  if (loading) return <p className="loading-text">Loading…</p>
  if (error) return (
    <div>
      <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
      <Link to="/requests">← Back to requests</Link>
    </div>
  )

  const isArtist = user?.id === request.artistId
  const role = isArtist ? 'artist' : user?.id === request.requesterId ? 'client' : null
  const isTerminal = request.state === 'Completed' || request.state === 'Cancelled'
  const legal = role ? (LEGAL[request.state]?.[role] ?? []) : []
  const can = (a) => legal.includes(a)
  const hasAgreed = request.agreedPrice != null

  async function doAction(action, payload = {}) {
    setActionError('')
    try {
      await api.post(`/api/Request/${id}/${ENDPOINT[action]}`, {
        idempotencyKey: crypto.randomUUID(),
        ...payload,
      })
      await load()
      return true
    } catch (err) {
      const msg = err.response?.data
      setActionError(typeof msg === 'string' ? msg : 'Action failed.')
      return false
    }
  }

  async function submitOffer(e) {
    e.preventDefault()
    const ok = await doAction('set_offer', {
      price: offer.price === '' ? null : Number(offer.price),
      deadline: offer.deadline ? new Date(offer.deadline).toISOString() : null,
    })
    if (ok) setOffer({ price: '', deadline: '' })
  }
  async function submitDeliverable(e) {
    e.preventDefault()
    if (await doAction('submit_artwork', { note: deliverable })) setDeliverable('')
  }
  async function submitRevisions(e) {
    e.preventDefault()
    if (await doAction('request_revisions', { note: revisionNote })) { setRevisionNote(''); setReviewPanel('none') }
  }
  async function submitAccept(e) {
    e.preventDefault()
    const ok = await doAction('accept_artwork', { rating: Number(review.rating), review: review.content })
    if (ok) { setReview({ content: '', rating: 5 }); setReviewPanel('none') }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!message.trim()) return
    try {
      await api.post(`/api/Request/${id}/messages`, { content: message })
      setMessage('')
      await load()
    } catch { /* non-critical */ }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Link to="/requests" style={{ fontSize: '0.875rem', color: '#6E6785' }}>← Back to requests</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '1rem 0 1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0 }}>{request.title}</h1>
        <StatusBadge state={request.state} progressMode={request.progressMode} viewerRole={role} />
      </div>

      {/* Parties */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p style={labelStyle}>Requester</p>
            <p style={{ margin: 0, color: '#1F1B2D' }}>{request.requesterUsername}</p>
            {isArtist && <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>{request.requesterEmail}</p>}
          </div>
          <div>
            <p style={labelStyle}>Artist</p>
            <p style={{ margin: 0, color: '#1F1B2D' }}>{request.artistUsername}</p>
          </div>
        </div>
        {request.description && (
          <div style={{ marginTop: '1rem' }}>
            <p style={labelStyle}>Description</p>
            <p style={{ margin: 0, color: '#1F1B2D', lineHeight: 1.6 }}>{request.description}</p>
          </div>
        )}
      </div>

      {/* Deal panel: proposed vs locked */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.9rem', color: '#1F1B2D' }}>Deal terms</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={labelStyle}>{hasAgreed ? 'Proposed (superseded)' : 'Proposed (not binding)'}</p>
            <DealTerm
              price={request.proposedPrice}
              deliveryTime={request.proposedDeliveryTime}
              deadline={request.proposedDeadline}
              style={{ color: hasAgreed ? '#6E6785' : '#1F1B2D' }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <p style={labelStyle}>🔒 Agreed (locked)</p>
            {hasAgreed ? (
              <DealTerm
                price={request.agreedPrice}
                deliveryTime={request.agreedDeliveryTime}
                deadline={request.agreedDeadline}
                style={{ color: '#166534', fontWeight: 600 }}
              />
            ) : (
              <p className="muted" style={{ margin: 0 }}>Locked once the client accepts an offer.</p>
            )}
          </div>
        </div>
      </div>

      {request.state === 'Completed' && (
        <div style={{ ...cardStyle, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
          <p style={{ margin: 0, color: '#166534' }}>
            ✅ This commission is complete. <Link to={`/artists/${encodeURIComponent(request.artistUsername)}?tab=references`} style={{ color: '#166534', fontWeight: 600 }}>View it on {request.artistUsername}'s profile →</Link>
          </p>
        </div>
      )}

      {/* Actions — only those legal in (state, role) for this viewer (cancel always available) */}
      {role && !isTerminal && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.9rem', color: '#1F1B2D' }}>Actions</h2>

          {/* First offer (WaitingArtistReview): a plain offer form — nothing to accept yet. */}
          {can('set_offer') && !can('accept_offer') && (
            <form onSubmit={submitOffer} className="form-stack" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="field-label">Price (USD)</label>
                  <input type="number" min="0" step="0.01" value={offer.price} required
                    onChange={e => setOffer({ ...offer, price: e.target.value })} placeholder="e.g. 200" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="field-label">Deadline</label>
                  <input type="date" value={offer.deadline} required
                    onChange={e => setOffer({ ...offer, deadline: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-primary">Send offer</button>
            </form>
          )}

          {/* Negotiation: whoever holds the turn sees the exact same Actions — accept the
              terms on the table, or counter with a new price + deadline. The only difference
              is the endpoint: the client's counter is `counter_offer`, the artist's `set_offer`. */}
          {can('accept_offer') && (
            <NegotiationActions
              onAccept={() => doAction('accept_offer')}
              counterLabel="Counter offer"
              fields={[
                { key: 'price', label: 'Price (USD)', type: 'number', placeholder: 'e.g. 200' },
                { key: 'deadline', label: 'Deadline', type: 'date' },
              ]}
              onCounter={vals => {
                const price = vals.price === '' ? null : Number(vals.price)
                const deadline = vals.deadline ? new Date(vals.deadline).toISOString() : null
                return can('counter_offer')
                  ? doAction('counter_offer', { budget: price, deadline })
                  : doAction('set_offer', { price, deadline })
              }}
            />
          )}

          {can('submit_artwork') && (
            <form onSubmit={submitDeliverable} className="form-stack" style={{ marginBottom: '1rem' }}>
              <label className="field-label">Deliverable image URL</label>
              <input type="text" value={deliverable} required
                onChange={e => setDeliverable(e.target.value)} placeholder="https://…" />
              <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                Paste an image link to the finished piece. It's shared in the thread for review.
              </p>
              {deliverable && (
                <img src={deliverable} alt="Deliverable preview"
                  style={{ marginTop: '0.5rem', width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #DDD6F7', display: 'block' }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}
              <button type="submit" className="btn-primary">Submit artwork for review</button>
            </form>
          )}

          {/* Client review of the delivered artwork: latest image + Accept / Request Revision */}
          {can('accept_artwork') && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={labelStyle}>Latest delivery</p>
              {request.deliverable ? (
                <a href={request.deliverable} target="_blank" rel="noreferrer">
                  <img src={request.deliverable} alt="Delivered artwork"
                    style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 10, border: '1px solid #DDD6F7', display: 'block', marginBottom: '0.85rem' }}
                    onError={e => { e.target.style.display = 'none' }} />
                </a>
              ) : (
                <p className="muted" style={{ marginBottom: '0.85rem' }}>No image attached.</p>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary"
                  onClick={() => setReviewPanel(reviewPanel === 'accept' ? 'none' : 'accept')}>Accept Artwork</button>
                <button className="btn-secondary"
                  onClick={() => setReviewPanel(reviewPanel === 'revision' ? 'none' : 'revision')}>Request Revision</button>
              </div>

              {reviewPanel === 'accept' && (
                <form onSubmit={submitAccept} className="form-stack" style={{ marginTop: '0.9rem', borderTop: '1px solid #EEE9FB', paddingTop: '0.9rem' }}>
                  <div>
                    <label className="field-label">Review</label>
                    <textarea value={review.content} rows={3} required style={{ resize: 'vertical' }}
                      onChange={e => setReview({ ...review, content: e.target.value })}
                      placeholder="Share your thoughts on the finished piece…" />
                  </div>
                  <div>
                    <label className="field-label">Rating</label>
                    <select value={review.rating} onChange={e => setReview({ ...review, rating: e.target.value })} style={{ width: 'auto' }}>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <p className="muted" style={{ fontSize: '0.8rem' }}>
                    Accepting marks the request complete and publishes it to the artist's profile.
                  </p>
                  <button type="submit" className="btn-primary">Accept & Complete</button>
                </form>
              )}

              {reviewPanel === 'revision' && (
                <form onSubmit={submitRevisions} className="form-stack" style={{ marginTop: '0.9rem', borderTop: '1px solid #EEE9FB', paddingTop: '0.9rem' }}>
                  <label className="field-label">What needs changing?</label>
                  <textarea value={revisionNote} rows={2} required style={{ resize: 'vertical' }}
                    onChange={e => setRevisionNote(e.target.value)} placeholder="Describe the revisions you'd like…" />
                  <button type="submit" className="btn-secondary">Send Revision</button>
                </form>
              )}
            </div>
          )}

          {legal.length === 0 && (
            <p className="muted" style={{ margin: '0 0 0.8rem' }}>
              Waiting on the other party — nothing to do right now.
            </p>
          )}

          {/* Cancel is legal for either party from any non-terminal state */}
          <div style={{ borderTop: '1px solid #EEE9FB', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
            <button className="btn-secondary" onClick={() => doAction('cancel')}>Cancel request</button>
          </div>

          {actionError && <p className="error-text" style={{ marginTop: '0.8rem' }}>{actionError}</p>}
        </div>
      )}

      {/* Messaging */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.9rem', color: '#1F1B2D' }}>Messages</h2>
        {request.messages.length === 0 ? (
          <p className="muted" style={{ marginBottom: '1rem' }}>No messages yet. Start the conversation below.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {request.messages.map(m => {
              const mine = m.senderId === user?.id
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ background: mine ? '#5B3FD6' : '#F3EEFF', color: mine ? '#fff' : '#1F1B2D', borderRadius: 10, padding: '0.55rem 0.8rem', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    <MessageContent content={m.content} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#6E6785', margin: '0.2rem 0 0', textAlign: mine ? 'right' : 'left' }}>
                    {m.senderUsername} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.6rem' }}>
          <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a message…" style={{ flex: 1 }} />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>Send</button>
        </form>
      </div>

      {/* Audit history timeline (append-only) */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.9rem', color: '#1F1B2D' }}>Action history</h2>
        {request.logs.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {request.logs.map(l => (
              <li key={l.id} style={{ fontSize: '0.85rem', color: '#1F1B2D', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span>
                  <strong>{l.actorUsername}</strong> ({l.actorRole}) {ACTION_LABEL[l.action] || l.action}
                  {l.fromState !== l.toState && (
                    <span className="muted" style={{ fontSize: '0.75rem' }}> · {l.fromState} → {l.toState}</span>
                  )}
                </span>
                <span className="muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
