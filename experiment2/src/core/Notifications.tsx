// In-app notification banners ("Your order is packed", "Sam: Thanks!"), so the apps feel live.
// The same in both friction levels. A banner never shows while a prompt sheet is open, and one
// that is showing hides as soon as a sheet opens, so it can't cover or time a decision.
import { useEffect, useRef, useState } from 'react'
import { logEvent } from '../log/logEvent'
import { isSheetOpen } from './Sheet'
import { delayFor } from './timing'

export interface Notice {
  id: string
  /** Who it's from: the app, or a person (e.g. Sam). */
  from: string
  /** From a person (a message) rather than the app: drawn like a messaging app's banner. */
  person?: boolean
  text: string
  /** Wait this long after it becomes due (e.g. a reply "typed" by Sam). */
  after?: 'noticeReply'
  /** Mark as seen without showing (e.g. an order update while the order is already on screen). */
  quiet?: boolean
}

/** Message banners from people (e.g. Sam), in both apps. */
const PERSON_COLOR = '#34a853'

/** How often to check whether a prompt sheet has opened or closed. */
const POLL_MS = 250

/**
 * Shows each notice once, when it first appears in `due`. Notices already due when the app opens
 * (e.g. after a reload) are treated as seen, so nothing replays.
 */
export function Notifications({ due, accent }: { due: Notice[]; accent: string }) {
  const seen = useRef<Set<string> | null>(null)
  const [queue, setQueue] = useState<{ notice: Notice; readyAt: number }[]>([])
  const [showing, setShowing] = useState<Notice | null>(null)

  if (seen.current === null) seen.current = new Set(due.map((n) => n.id))

  useEffect(() => {
    const fresh = due.filter((n) => !seen.current!.has(n.id))
    if (fresh.length === 0) return
    for (const n of fresh) seen.current!.add(n.id)
    const now = Date.now()
    const shown = fresh.filter((n) => !n.quiet)
    if (shown.length) setQueue((q) => [...q, ...shown.map((notice) => ({ notice, readyAt: now + (notice.after ? delayFor(notice.after) : 0) }))])
  }, [due])

  // Start the next notice when it's ready and no prompt is open.
  useEffect(() => {
    if (showing || queue.length === 0) return
    const tryShow = () => {
      const [next] = queue
      if (Date.now() < next.readyAt || isSheetOpen()) return false
      setQueue((q) => q.slice(1))
      setShowing(next.notice)
      logEvent('action', { name: 'notification', id: next.notice.id })
      return true
    }
    if (tryShow()) return
    const id = setInterval(tryShow, POLL_MS)
    return () => clearInterval(id)
  }, [queue, showing])

  // Hide after a few seconds, or straight away if a prompt opens.
  useEffect(() => {
    if (!showing) return
    const hideAt = Date.now() + delayFor('notice')
    const id = setInterval(() => {
      if (isSheetOpen() || Date.now() >= hideAt) setShowing(null)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [showing])

  return (
    <div className="notice-layer" aria-live="polite">
      {showing && <Banner notice={showing} accent={accent} onClose={() => setShowing(null)} />}
    </div>
  )
}

function Banner({ notice, accent, onClose }: { notice: Notice; accent: string; onClose: () => void }) {
  return (
    <button type="button" className="notice-banner" onClick={onClose}>
      <span className="notice-banner-icon" style={{ background: notice.person ? PERSON_COLOR : accent }} aria-hidden="true">
        {notice.from.slice(0, 1).toUpperCase()}
      </span>
      <span className="notice-banner-body">
        <span className="notice-banner-from">{notice.from}</span>
        <span className="notice-banner-text">{notice.text}</span>
      </span>
      <span className="notice-banner-time" aria-hidden="true">
        now
      </span>
    </button>
  )
}
