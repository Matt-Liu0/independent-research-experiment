import type { AppState } from './appState'
import { delayFor } from '../core/timing'

/**
 * The order's next step, if it's due. Placed → Packed → On the way run on visible time.
 * Delivery also waits for both order prompts (background location, Sam), so the
 * "keep background location on?" question can follow from the first.
 */
export function nextOrderStep(s: AppState): 'packed' | 'on_the_way' | 'delivered' | null {
  if (!s.orderTrackingStarted) return null
  if (s.order === 'placed' && s.orderElapsedMs >= delayFor('orderPacked')) return 'packed'
  if (s.order === 'packed' && s.orderElapsedMs >= delayFor('orderOnTheWay')) return 'on_the_way'
  if (s.order === 'on_the_way') {
    const promptsAnswered = s.settled.includes('bg_during_order') && s.settled.includes('sam_share')
    const onTheWayFor = s.orderElapsedMs - (s.orderOnTheWayAtMs ?? 0)
    if (promptsAnswered && onTheWayFor >= delayFor('orderMinOnTheWay')) return 'delivered'
  }
  return null
}

/** How far the courier has come, 0–1, while on the way. */
export function courierProgress(s: AppState): number {
  if (s.order === 'delivered') return 1
  if (s.order !== 'on_the_way') return 0
  const total = delayFor('orderMinOnTheWay')
  if (total <= 0) return 0.5
  // Slows toward the end, so the courier doesn't sit at the door while prompts are unanswered.
  const t = Math.min(1, (s.orderElapsedMs - (s.orderOnTheWayAtMs ?? 0)) / total)
  return 0.9 * t
}

const MINUTE = 60_000

/** Minutes from ordering to the delivery estimate shown to the participant. */
export const DELIVERY_MINUTES = 20

export function clockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "Today, 3:15–3:30 PM": starts at least 15 minutes from now, on a 5-minute mark. */
export function deliveryWindow(now: number): string {
  const start = Math.ceil((now + 15 * MINUTE) / (5 * MINUTE)) * 5 * MINUTE
  const end = start + 15 * MINUTE
  const [startText, endText] = [clockTime(start), clockTime(end)]
  const startShort = startText.endsWith(endText.slice(-2)) ? startText.slice(0, -3) : startText
  return `Today, ${startShort}–${endText}`
}

/** Estimated arrival, from when the order was placed. */
export function arrivalTime(s: AppState, now = Date.now()): string {
  return clockTime((s.orderPlacedAt ?? now) + DELIVERY_MINUTES * MINUTE)
}

/** "About 9 min away" while on the way; compressed so it reaches about 1 at the door. */
export function minutesAway(s: AppState): number {
  return Math.max(1, Math.round(12 * (1 - courierProgress(s))))
}
