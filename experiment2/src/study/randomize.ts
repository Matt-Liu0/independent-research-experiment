import type { Friction, TaskNumber } from '../bramble/types'

/** Uniform random number in [0, 1) from the browser's cryptographic generator. */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

export type Counts = Record<Friction, number>

/** The level with fewer participants so far; a coin flip on a tie. */
export function pickLevel(counts: Counts, random: () => number = cryptoRandom): Friction {
  if (counts.nudged < counts.neutral) return 'nudged'
  if (counts.neutral < counts.nudged) return 'neutral'
  return random() < 0.5 ? 'nudged' : 'neutral'
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
