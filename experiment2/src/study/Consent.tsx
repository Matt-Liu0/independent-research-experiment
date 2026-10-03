import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import { CONSENT } from './consentText'
import { Message } from './Message'
import type { StageProps } from './stageProps'

export function Consent({ store, update, advance }: StageProps) {
  const [status, setStatus] = useState<'reading' | 'assigning' | 'error' | 'declined'>('reading')

  async function agree() {
    setStatus('assigning')
    update({ consentVersion: CONSENT.version }, ['consentAt'])
    logEvent('stage', { name: 'consent', agreed: true, version: CONSENT.version })
    try {
      // Friction and task order are assigned only after consent (protocol: randomize late).
      const { friction, taskOrder } = await store.assign()
      advance({ friction, taskOrder })
    } catch (err) {
      console.error(err)
      logEvent('error', { where: 'assign', message: String(err) })
      setStatus('error')
    }
  }

  function decline() {
    update({ consentDeclined: true })
    logEvent('stage', { name: 'consent', agreed: false, version: CONSENT.version })
    setStatus('declined')
  }

  if (status === 'declined') {
    return (
      <Message title="Thank you">
        <p>You've chosen not to take part. Please return this study on Prolific. You won't be penalized.</p>
      </Message>
    )
  }

  return (
    <main className="page">
      {CONSENT.isDraft && <p className="notice notice-warn small">DRAFT consent text. Replace before launch.</p>}
      <h1>{CONSENT.title}</h1>
      <p>{CONSENT.intro}</p>
      <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
        {CONSENT.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="muted small">{CONSENT.contact}</p>
      <div className="page-spacer" />
      {status === 'error' && (
        <p className="notice notice-warn" role="alert">
          We couldn't connect. Check your signal and try again.
        </p>
      )}
      <button className="btn btn-study" onClick={agree} disabled={status === 'assigning'}>
        {status === 'assigning' ? 'One moment…' : CONSENT.agree}
      </button>
      <button className="btn btn-link" onClick={decline} disabled={status === 'assigning'}>
        {CONSENT.decline}
      </button>
    </main>
  )
}
