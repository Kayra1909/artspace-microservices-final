// Colour-coded pill for a request's state-machine state, with an optional progress-mode
// suffix while Work in progress (e.g. "Work in progress · revisions requested").
const STYLES = {
  WaitingArtistReview: { label: 'Waiting for artist', bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  NegotiationClient: { label: `Review artist's offer`, bg: '#DBEAFE', fg: '#1E40AF', border: '#93C5FD' },
  NegotiationArtist: { label: 'Negotiating', bg: '#DBEAFE', fg: '#1E40AF', border: '#93C5FD' },
  WorkInProgress: { label: 'Work in progress', bg: '#EDE8FB', fg: '#5B3FD6', border: '#C4B5FD' },
  WaitingReviewClient: { label: 'Awaiting review', bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  Completed: { label: 'Completed', bg: '#DCFCE7', fg: '#166534', border: '#86EFAC' },
  Cancelled: { label: 'Cancelled', bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' },
}

const PROGRESS_SUFFIX = {
  Accepted: 'accepted',
  Rejected: 'revisions requested',
}

const UNKNOWN = { label: 'Unknown', bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' }

export default function StatusBadge({ state, progressMode, viewerRole }) {
  // Fall back to a neutral "Unknown" rather than a real terminal state, so a missing/stale
  // `state` (e.g. an out-of-date backend) never masquerades as a genuine "Cancelled".
  const s = STYLES[state] || { ...UNKNOWN, label: state || 'Unknown' }

  // Several states are relative to who's looking: the same state is "your move" for
  // the party whose turn it is, and "awaiting them" for the other party.
  let label = s.label
  if (state === 'WaitingReviewClient') {
    if (viewerRole === 'artist') label = 'Awaiting client confirmation'
    else if (viewerRole === 'client') label = 'Awaiting your confirmation'
  } else if (state === 'NegotiationClient') {
    // Artist has made an offer; it's the client's turn to accept or counter.
    if (viewerRole === 'artist') label = 'Awaiting client confirmation'
    else if (viewerRole === 'client') label = `Review artist's offer`
  } else if (state === 'NegotiationArtist') {
    // Client has countered; it's the artist's turn to respond with an offer.
    if (viewerRole === 'client') label = 'Awaiting artist offer'
    else if (viewerRole === 'artist') label = `Review client's offer`
  }

  const suffix = state === 'WorkInProgress' && PROGRESS_SUFFIX[progressMode]
  return (
    <span style={{
      background: s.bg,
      color: s.fg,
      border: `1px solid ${s.border}`,
      borderRadius: 99,
      fontSize: '0.72rem',
      fontWeight: 700,
      padding: '0.18rem 0.65rem',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}{suffix ? ` · ${suffix}` : ''}
    </span>
  )
}
