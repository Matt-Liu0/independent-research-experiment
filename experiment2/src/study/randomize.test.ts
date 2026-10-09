import { describe, expect, it } from 'vitest'
import { PATTERNS, UNITS, parsePattern, patternKey } from '../bramble/units'
import { pickPattern, shuffleTasks } from './randomize'

describe('shuffleTasks', () => {
  it('keeps 3 straight after 2 and 6 last, over 10,000 runs', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) {
      const order = shuffleTasks()
      expect([...order].sort()).toEqual([1, 2, 3, 4, 5, 6])
      expect(order[5]).toBe(6)
      expect(order[order.indexOf(2) + 1]).toBe(3)
      seen.add(order.join(''))
    }
    // 4 units → 24 valid orders, and all should appear.
    expect(seen.size).toBe(24)
  })

  it('makes each task about equally likely to come first', () => {
    const first: Record<number, number> = {}
    const runs = 20_000
    for (let i = 0; i < runs; i++) {
      const t = shuffleTasks()[0]
      first[t] = (first[t] ?? 0) + 1
    }
    expect(Object.keys(first).sort()).toEqual(['1', '2', '4', '5'])
    for (const n of Object.values(first)) expect(Math.abs(n / runs - 0.25)).toBeLessThan(0.02)
  })
})

describe('pickPattern', () => {
  it('has 20 patterns, each nudging 3 of the 6 screens', () => {
    expect(PATTERNS).toHaveLength(20)
    expect(new Set(PATTERNS.map(patternKey)).size).toBe(20)
    for (const p of PATTERNS) expect(p).toHaveLength(3)
  })

  it('picks a least-used pattern', () => {
    const counts = Object.fromEntries(PATTERNS.map((p) => [patternKey(p), 2]))
    counts['U2U4U6'] = 1
    expect(pickPattern(counts)).toBe('U2U4U6')
  })

  it('balances patterns, and so nudges each screen for exactly half of 200 sequential participants', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 200; i++) {
      const k = pickPattern(counts)
      counts[k] = (counts[k] ?? 0) + 1
    }
    expect(Object.values(counts)).toEqual(Array(20).fill(10))
    for (const unit of UNITS) {
      const nudged = Object.entries(counts)
        .filter(([k]) => parsePattern(k).includes(unit))
        .reduce((n, [, c]) => n + c, 0)
      expect(nudged, unit).toBe(100)
    }
  })
})
