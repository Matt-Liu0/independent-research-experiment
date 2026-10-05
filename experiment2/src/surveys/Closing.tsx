import { useEffect, useState } from 'react'
import { bonusDollars } from '../bramble/appState'
import { COMPLETION_CODE, completionUrl, fromProlific } from '../study/prolific'
import type { StageProps } from '../study/stageProps'

/** Give up waiting for the server after this long; the offline queue keeps trying in the background. */
const FLUSH_TIMEOUT_MS = 15_000

export function Closing({ participant, store, mode }: StageProps) {
  const [saving, setSaving] = useState<'saving' | 'saved' | 'slow'>('saving')

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => !cancelled && setSaving('slow'), FLUSH_TIMEOUT_MS)
    store
      .flush()
      .then(() => !cancelled && setSaving('saved'))
      .catch(() => !cancelled && setSaving('slow'))
      .finally(() => clearTimeout(timeout))
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [store])

  const points = participant.appState?.points ?? 0

  if (mode === 'agent') {
    return (
      <main className="page">
        <h1>All tasks finished</h1>
        <p>You kept {points} Bramble points.</p>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Thanks, that's Part 1</h1>
      <p>
        You kept {points} Bramble points, so your bonus is ${bonusDollars(points).toFixed(2)}.{' '}
        {fromProlific(participant.recruitment)
          ? 'Your points bonus will be paid within 3 days.'
          : 'Your points bonus will be paid as described in your invitation.'}
      </p>
      <p>
        Part 2 opens in 7 days, and we'll send you a message when it does. It takes about 45 minutes on a computer.
      </p>
      <div className="page-spacer" />
      {saving === 'saving' && (
        <p className="muted" role="status">
          Saving your answers…
        </p>
      )}
      {saving === 'slow' && (
        <p className="notice notice-warn" role="status">
          Your connection is slow. Please keep this page open for a moment, then tap below.
        </p>
      )}
      {mode === 'demo' ? (
        <p className="notice">Demo: nothing was saved, and there is no Prolific code.</p>
      ) : !fromProlific(participant.recruitment) ? (
        <p role="status">{saving === 'saving' ? 'Saving your answers…' : "You're all done for today. You can close this page."}</p>
      ) : (
        <a
          className="btn btn-study"
          href={completionUrl(COMPLETION_CODE)}
          aria-disabled={saving === 'saving'}
          onClick={(e) => saving === 'saving' && e.preventDefault()}
        >
          {saving === 'saving' ? 'Saving…' : 'Back to Prolific'}
        </a>
      )}
    </main>
  )
}
