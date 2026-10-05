import { useCallback, useRef, useState } from 'react'
import { delayFor, type TimingKey } from './timing'

/**
 * Runs an action after a "talking to the server" delay, showing a spinner meanwhile.
 * The action still runs if the screen closes in the meantime, so nothing is lost.
 * Returns the key of the action in progress (or null) and a function to start one.
 */
export function useBusy(): [string | null, (key: TimingKey, action: () => void, id?: string) => void] {
  const [busy, setBusy] = useState<string | null>(null)
  const running = useRef(false)

  const run = useCallback((key: TimingKey, action: () => void, id: string = key) => {
    if (running.current) return
    const ms = delayFor(key)
    if (ms <= 0) {
      action()
      return
    }
    running.current = true
    setBusy(id)
    setTimeout(() => {
      running.current = false
      setBusy(null)
      action()
    }, ms)
  }, [])

  return [busy, run]
}
