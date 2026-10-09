// Friction varies within each participant, by decision screen ("unit"): each person gets three
// of the six units nudged and three neutral. Flows that share a screen share a unit, so no
// screen mixes nudged and neutral options. Decided with Noah, Oct 2026.
import type { FlowDef, Friction } from './types'

export const UNITS = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'] as const
export type UnitId = (typeof UNITS)[number]

/** What each unit is, for codebooks and the paper. */
export const UNIT_SCREENS: Record<UnitId, string> = {
  U1: 'Location prompt (Find a store): #1, #2',
  U2: 'Checkout: #3, #4',
  U3: 'Order tracking: #5, #6',
  U4: 'Keep background location on? (delivery): #7',
  U5: 'Deals settings: #8, #9',
  U6: 'Rewards offers: #10, #11, #12',
}

/** How many units each participant has nudged. */
export const NUDGED_PER_PERSON = 3

/** All 20 ways to pick 3 of the 6 units, in a fixed order. Assignment balances across these. */
export const PATTERNS: UnitId[][] = (() => {
  const out: UnitId[][] = []
  const pick = (start: number, chosen: UnitId[]) => {
    if (chosen.length === NUDGED_PER_PERSON) {
      out.push(chosen)
      return
    }
    for (let i = start; i < UNITS.length; i++) pick(i + 1, [...chosen, UNITS[i]])
  }
  pick(0, [])
  return out
})()

/**
 * A pattern is written as the nudged units joined, e.g. "U1U3U5" ("" = none nudged).
 * The same string is the participant's `pattern` and the key of its assignment counter.
 */
export function patternKey(nudged: readonly UnitId[]): string {
  return [...nudged].sort().join('')
}

export function parsePattern(key: string | null | undefined): UnitId[] {
  if (!key) return []
  const found: string[] = key.match(/U[1-6]/g) ?? []
  return UNITS.filter((u) => found.includes(u))
}

export function frictionOfUnit(unit: UnitId, nudged: readonly UnitId[]): Friction {
  return nudged.includes(unit) ? 'nudged' : 'neutral'
}

export function frictionOf(flow: FlowDef, nudged: readonly UnitId[]): Friction {
  return frictionOfUnit(flow.unit, nudged)
}

/** Every unit at one level (demo links, and uniform agent runs). */
export function uniformUnits(friction: Friction): UnitId[] {
  return friction === 'nudged' ? [...UNITS] : []
}

/** The mirror image: nudged ↔ neutral for every unit (Experiment 4 agent runs). */
export function mirrorUnits(nudged: readonly UnitId[]): UnitId[] {
  return UNITS.filter((u) => !nudged.includes(u))
}
