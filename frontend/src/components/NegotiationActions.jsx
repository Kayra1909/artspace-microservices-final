import { useState } from 'react'

const labelStyle = { fontSize: '0.72rem', color: '#6E6785', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }

// Shared negotiation controls shown to whichever party holds the turn during the
// offer/counter-offer phase: an "Accept & lock terms" button plus a collapsible
// counter form. The counter form's fields, labels and submit differ per side
// (client counters with budget+deadline; artist re-offers with price+eta), so the
// caller passes `fields` and an async `onCounter(values)` that returns truthy on
// success. `onAccept` finalizes the terms currently on the table.
export default function NegotiationActions({ onAccept, onCounter, fields, counterLabel = 'Counter offer' }) {
  const [showCounter, setShowCounter] = useState(false)
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.key, ''])))

  async function submit(e) {
    e.preventDefault()
    if (await onCounter(values)) {
      setValues(Object.fromEntries(fields.map(f => [f.key, ''])))
      setShowCounter(false)
    }
  }

  return (
    <>
      <button className="btn-primary" style={{ marginRight: '0.6rem', marginBottom: '0.6rem' }}
        onClick={onAccept}>Accept &amp; lock terms</button>

      {!showCounter && (
        <button className="btn-secondary" style={{ marginBottom: '1rem' }}
          onClick={() => setShowCounter(true)}>{counterLabel}</button>
      )}

      {showCounter && (
        <form onSubmit={submit} className="form-stack" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <p style={labelStyle}>{counterLabel}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {fields.map((f, i) => (
              <div key={f.key} style={{ flex: '1 1 140px' }}>
                <label className="field-label">{f.label}</label>
                <input
                  type={f.type}
                  value={values[f.key]}
                  required
                  autoFocus={i === 0}
                  min={f.type === 'number' ? '0' : undefined}
                  step={f.type === 'number' ? '0.01' : undefined}
                  placeholder={f.placeholder}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="submit" className="btn-secondary">Send {counterLabel.toLowerCase()}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowCounter(false)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  )
}
