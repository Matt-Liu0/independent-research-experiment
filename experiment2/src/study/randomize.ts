import type { TaskNumber } from '../bramble/types'
import { PATTERNS, patternKey } from '../bramble/units'

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
export function shuffleTasks(random: () => number = cryptoRandom): TaskNumber[] {
  const units: TaskNumber[][] = [[1], [2, 3], [4], [5]]
  for (let i = units.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[units[i], units[j]] = [units[j], units[i]]
  }
  const store = units.findIndex((u) => u[0] === 1)
  const order = units.findIndex((u) => u[0] === 2)
  if (order < store) [units[store], units[order]] = [units[order], units[store]]
  return [...units.flat(), 6]
}

/** How many participants have each nudged-unit pattern, keyed by pattern ("U1U3U5"). Missing = 0. */
export type PatternCounts = Record<string, number>

/**
 * The least-used of the 20 patterns (3 of 6 units nudged); a random one among ties.
 * Using every pattern equally often also nudges each unit for exactly half the sample.
 */
export function pickPattern(counts: PatternCounts, random: () => number = cryptoRandom): string {
  const keys = PATTERNS.map(patternKey)
  const fewest = Math.min(...keys.map((k) => counts[k] ?? 0))
  const tied = keys.filter((k) => (counts[k] ?? 0) === fewest)
  return tied[Math.floor(random() * tied.length)]
}
