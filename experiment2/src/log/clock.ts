// Session clock. clientT is ms since the page loaded; visibleMs leaves out time
// the page was hidden (app switched, phone locked), so decision times aren't inflated.

let start = performance.now()
let hiddenTotal = 0
let hiddenSince: number | null = null

export function clientT(): number {
  return Math.round(performance.now() - start)
}

export function visibleMs(): number {
  const now = performance.now()
  const hidden = hiddenTotal + (hiddenSince === null ? 0 : now - hiddenSince)
  return Math.round(now - start - hidden)
}

export function markHidden(): void {
  if (hiddenSince === null) hiddenSince = performance.now()
}

export function markVisible(): void {
  if (hiddenSince !== null) {
    hiddenTotal += performance.now() - hiddenSince
    hiddenSince = null
  }
}

/** Tests only. */
export function resetClock(): void {
  start = performance.now()
  hiddenTotal = 0
  hiddenSince = null
}
