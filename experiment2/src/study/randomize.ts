import type { BrambleTask } from '../bramble/types'
import { PATTERNS, patternKey } from '../core/units'
import type { StrideTask } from '../stride/types'
import { APP_ORDERS, type AppOrder, type TaskNumber } from './apps'

/** Uniform random number in [0, 1) from the browser's cryptographic generator. */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/**
 * Random task order with Task 1 (set a store) before Task 2 (order from it), Task 3 straight
 * after Task 2, and Task 6 last. Shuffles the units {1, [2,3], 4, 5}, then swaps 1 and [2,3]
 * if they came out the wrong way round. Each of the 12 valid orders comes from exactly two
 * shuffles, so all are equally likely.
 */
export function shuffleTasks(random: () => number = cryptoRandom): BrambleTask[] {
  const units: BrambleTask[][] = [[1], [2, 3], [4], [5]]
  for (let i = units.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[units[i], units[j]] = [units[j], units[i]]
  }
  const store = units.findIndex((u) => u[0] === 1)
  const order = units.findIndex((u) => u[0] === 2)
  if (order < store) [units[store], units[order]] = [units[order], units[store]]
  return [...units.flat(), 6]
}

/** Random Stride order: Task 7 (connect health data, set up sign-in) first, then 8–10 in any of 6 orders. */
export function shuffleStrideTasks(random: () => number = cryptoRandom): StrideTask[] {
  const rest: StrideTask[] = [8, 9, 10]
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [7, ...rest]
}

/** The session's 10 tasks: each app's tasks as one block, in the app order. */
export function buildTaskOrder(appOrder: AppOrder, random: () => number = cryptoRandom): TaskNumber[] {
  const bramble = shuffleTasks(random)
  const stride = shuffleStrideTasks(random)
  return appOrder === 'bramble_first' ? [...bramble, ...stride] : [...stride, ...bramble]
}

/**
 * Assignment cell: nudged-screen pattern plus app order, e.g. "U1U3U5B" (Bramble first) or
 * "U1U3U5S" (Stride first). The key of its counter in <meta>/assignment.
 */
export function cellKey(pattern: string, appOrder: AppOrder): string {
  return pattern + (appOrder === 'bramble_first' ? 'B' : 'S')
}

/** All 40 cells: 20 patterns × 2 app orders. */
export const CELLS: { pattern: string; appOrder: AppOrder }[] = PATTERNS.flatMap((p) =>
  APP_ORDERS.map((appOrder) => ({ pattern: patternKey(p), appOrder })),
)

/** How many participants have each cell, keyed by cellKey. Missing = 0. */
export type CellCounts = Record<string, number>

/**
 * The next participant's cell. The least-used cell first. Among ties, the least-used pattern
 * (over both app orders), then the less-used app order, then the least-nudged screens; then
 * at random. So at any sample size, not only multiples of 40: cells differ by at most 1, each
 * pattern and so each screen is nudged about equally often, each app comes first for about
 * half, and app order is crossed with the pattern.
 */
export function pickAssignment(
  counts: CellCounts,
  random: () => number = cryptoRandom,
): { pattern: string; appOrder: AppOrder } {
  const count = (c: { pattern: string; appOrder: AppOrder }) => counts[cellKey(c.pattern, c.appOrder)] ?? 0
  const patternTotal = (pattern: string) => APP_ORDERS.reduce((n, o) => n + (counts[cellKey(pattern, o)] ?? 0), 0)
  const orderTotal = (appOrder: AppOrder) => CELLS.filter((c) => c.appOrder === appOrder).reduce((n, c) => n + count(c), 0)
  const unitNudged = (unit: string) => CELLS.filter((c) => c.pattern.includes(unit)).reduce((n, c) => n + count(c), 0)
  const unitLoad = (pattern: string) => (pattern.match(/U[1-6]/g) ?? []).reduce((n, u) => n + unitNudged(u), 0)

  const keepLowest = (cells: typeof CELLS, score: (c: (typeof CELLS)[number]) => number) => {
    const best = Math.min(...cells.map(score))
    return cells.filter((c) => score(c) === best)
  }
  let tied = keepLowest(CELLS, count)
  tied = keepLowest(tied, (c) => patternTotal(c.pattern))
  tied = keepLowest(tied, (c) => orderTotal(c.appOrder))
  tied = keepLowest(tied, (c) => unitLoad(c.pattern))
  return tied[Math.floor(random() * tied.length)]
}
