import { useEffect, useState } from 'react'
import { START_POINTS } from '../bramble/data'
import { totalBonus } from '../core/bonus'
import { START_COINS } from '../stride/data'
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

  // Each app's balance; an app not reached keeps its starting balance (never happens once both are done).
  const points = participant.appState?.points ?? START_POINTS
  const coins = participant.strideState?.points ?? START_COINS
  const bonus = totalBonus(points, coins)

  if (mode === 'agent') {
    return (
      <main className="page">
        <h1>All tasks finished</h1>
        <p>
          You kept {points} Bramble points and {coins} Stride coins.
        </p>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Thanks, that's Part 1</h1>
      <p>
        You kept {points} Bramble points and {coins} Stride coins, so your bonus is ${bonus.toFixed(2)}. Your points bonus
        will be paid as described in your invitation.
      </p>
      <p>
        Part 2 opens in 7 days, and we'll send you a message when it does. It takes about 35 minutes on a computer.
      </p>
      <div className="page-spacer" />
      {saving === 'saving' && (
        <p className="muted" role="status">
          Saving your answers…
        </p>
      )}
      {saving === 'slow' && (
        <p className="notice notice-warn" role="status">
          Your connection is slow. Please keep this page open for a moment while your answers save.
        </p>
      )}
      {mode === 'demo' ? (
        <p className="notice">Demo: nothing was saved.</p>
      ) : (
        saving === 'saved' && <p role="status">You're all done for today. You can close this page.</p>
      )}
    </main>
  )
}
