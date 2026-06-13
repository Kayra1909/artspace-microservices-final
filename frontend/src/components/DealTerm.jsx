// One deal's terms rendered as "$200 · 2 weeks" or "$175 · by 6/20/2026". The time
// is whichever the last party supplied: a free-text ETA from the artist's offer, or
// a deadline date from the client's counter (shown as "by <date>"). Used for both the
// proposed and the locked/agreed columns so the two always format identically.
function formatDelivery(deliveryTime, deadline) {
  if (deadline) return `by ${new Date(deadline).toLocaleDateString()}`
  return deliveryTime || '—'
}

export default function DealTerm({ price, deliveryTime, deadline, style }) {
  return (
    <p style={{ margin: 0, ...style }}>
      {price != null ? `$${price}` : '—'} · {formatDelivery(deliveryTime, deadline)}
    </p>
  )
}
