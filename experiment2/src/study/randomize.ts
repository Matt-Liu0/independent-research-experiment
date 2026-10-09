import type { TaskNumber } from '../bramble/types'
import { PATTERNS, patternKey } from '../bramble/units'

/** Uniform random number in [0, 1) from the browser's cryptographic generator. */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/**
 * Random task order with Task 3 straight after Task 2 and Task 6 last.
 * Shuffles the units {1, [2,3], 4, 5}, so all 24 valid orders are equally likely.
 */
export function shuffleTasks(random: () => number = cryptoRandom): TaskNumber[] {
  const units: TaskNumber[][] = [[1], [2, 3], [4], [5]]
  for (let i = units.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[units[i], units[j]] = [units[j], units[i]]
  }
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
