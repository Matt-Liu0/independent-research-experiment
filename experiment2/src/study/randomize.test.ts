import { describe, expect, it } from 'vitest'
import { pickLevel, shuffleTasks } from './randomize'

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

describe('pickLevel', () => {
  it('picks the smaller group', () => {
    expect(pickLevel({ nudged: 3, neutral: 5 })).toBe('nudged')
    expect(pickLevel({ nudged: 5, neutral: 3 })).toBe('neutral')
  })

  it('flips a coin on a tie', () => {
    expect(pickLevel({ nudged: 2, neutral: 2 }, () => 0.1)).toBe('nudged')
    expect(pickLevel({ nudged: 2, neutral: 2 }, () => 0.9)).toBe('neutral')
  })

  it('stays balanced over 200 sequential participants', () => {
    const counts = { nudged: 0, neutral: 0 }
    for (let i = 0; i < 200; i++) counts[pickLevel(counts)]++
    expect(counts).toEqual({ nudged: 100, neutral: 100 })
  })
})
