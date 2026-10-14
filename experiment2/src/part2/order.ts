import { ATTENTION_ITEMS, ATTENTION_POSITIONS, BATTERY, REPEATED_ITEMS, type Wording } from './items'

/** One page of the questionnaire: a battery item in one wording, or an attention item. */
export type Slot = { kind: 'item'; itemId: string; wording: Wording } | { kind: 'attention'; itemId: string }

/** Minimum gap between the two wordings of a repeated flow (positions apart). */
export const MIN_REPEAT_GAP = 20

export function slotKey(slot: Slot): string {
  return slot.kind === 'item' ? `${slot.itemId}:${slot.wording}` : slot.itemId
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Whether a sequence keeps every rule (used by tests and to check a saved order). */
export function validSequence(slots: readonly Slot[]): boolean {
  const total = BATTERY.length + REPEATED_ITEMS.length + ATTENTION_ITEMS.length
  if (slots.length !== total) return false
  if (new Set(slots.map(slotKey)).size !== total) return false
  for (const [i, pos] of ATTENTION_POSITIONS.entries()) {
    const slot = slots[pos - 1]
    if (slot?.kind !== 'attention' || slot.itemId !== ATTENTION_ITEMS[i].id) return false
  }
  for (const id of REPEATED_ITEMS) {
    const a = slots.findIndex((s) => s.kind === 'item' && s.itemId === id && s.wording === 'A')
    const b = slots.findIndex((s) => s.kind === 'item' && s.itemId === id && s.wording === 'B')
    if (a < 0 || b < 0 || Math.abs(a - b) < MIN_REPEAT_GAP) return false
  }
  return BATTERY.every((item) => slots.some((s) => s.kind === 'item' && s.itemId === item.id && s.wording === 'A'))
}

/**
 * A random order: every battery item once, the 12 repeated flows a second time in the other
 * wording (which wording comes first is random) at least MIN_REPEAT_GAP positions later, and
 * the attention items at fixed positions.
 *
 * Shuffling alone almost never keeps all 12 gaps (about 1 in 100,000), so the repeated flows
 * are placed first, in random order, each at a random pair of free positions far enough apart
 * (starting over in the rare case none is left). The other items fill the remaining positions
 * in random order. Gaps are counted without the attention items, which only widen them.
 */
export function buildSequence(random: () => number = Math.random): Slot[] {
  const length = BATTERY.length + REPEATED_ITEMS.length
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]
  for (let attempt = 0; attempt < 1000; attempt++) {
    const placed: (Slot | null)[] = Array.from({ length }, () => null)
    let stuck = false
    for (const itemId of shuffle(REPEATED_ITEMS, random)) {
      const free = placed.flatMap((slot, i) => (slot === null ? [i] : []))
      const pairs = free.flatMap((i) => free.filter((j) => j - i >= MIN_REPEAT_GAP).map((j) => [i, j] as const))
      if (pairs.length === 0) {
        stuck = true
        break
      }
      const [i, j] = pick(pairs)
      const first: Wording = random() < 0.5 ? 'A' : 'B'
      placed[i] = { kind: 'item', itemId, wording: first }
      placed[j] = { kind: 'item', itemId, wording: first === 'A' ? 'B' : 'A' }
    }
    if (stuck) continue
    const singles = shuffle(
      BATTERY.filter((item) => !REPEATED_ITEMS.includes(item.id)).map((item): Slot => ({ kind: 'item', itemId: item.id, wording: 'A' })),
      random,
    )
    const slots = placed.map((slot) => slot ?? (singles.pop() as Slot))
    ATTENTION_POSITIONS.forEach((pos, i) => slots.splice(pos - 1, 0, { kind: 'attention', itemId: ATTENTION_ITEMS[i].id }))
    if (validSequence(slots)) return slots
  }
  throw new Error('Could not build a questionnaire order')
}
