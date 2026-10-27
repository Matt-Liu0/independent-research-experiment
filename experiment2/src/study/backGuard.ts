import { logEvent } from '../log/logEvent'

// The phone's Back button or swipe would otherwise leave the study (usually back to the invitation email).
// We keep an extra history entry in place: Back moves between app screens when the app is
// open, and does nothing during consent, ratings and surveys, so answers can't be redone.

let handler: (() => boolean) | null = null

/** The practice app registers its own Back while it's on screen. */
export function setBackHandler(next: (() => boolean) | null): void {
  handler = next
}

export function installBackGuard(win: Window = window): () => void {
  win.history.pushState({ bramble: true }, '')
  const onPopState = () => {
    const handled = handler?.() ?? false
    logEvent('action', { name: 'phone_back', handled })
    // Put the guard entry back so the next Back is caught too.
    win.history.pushState({ bramble: true }, '')
  }
  win.addEventListener('popstate', onPopState)
  return () => win.removeEventListener('popstate', onPopState)
}
