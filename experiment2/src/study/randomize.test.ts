import { describe, expect, it } from 'vitest'
import { PATTERNS, UNITS, parsePattern, patternKey } from '../core/units'
import { appOfTask, appOrderOf } from './apps'
import { validTaskOrder } from './prolific'
import { CELLS, buildTaskOrder, cellKey, pickAssignment, shuffleStrideTasks, shuffleTasks } from './randomize'

describe('shuffleTasks', () => {
  it('keeps 1 before 2, 3 straight after 2 and 6 last, over 10,000 runs', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) {
      const order = shuffleTasks()
      expect([...order].sort()).toEqual([1, 2, 3, 4, 5, 6])
      expect(order[5]).toBe(6)
      expect(order[order.indexOf(2) + 1]).toBe(3)
      expect(order.indexOf(1)).toBeLessThan(order.indexOf(2))
      seen.add(order.join(''))
    }
    // 4 units → 24 orders, half with 1 before [2,3] → 12 valid orders, and all should appear.
    expect(seen.size).toBe(12)
  })

  it('makes all 12 orders equally likely', () => {
    const counts: Record<string, number> = {}
    const runs = 24_000
    for (let i = 0; i < runs; i++) {
      const key = shuffleTasks().join('')
      counts[key] = (counts[key] ?? 0) + 1
    }
    for (const n of Object.values(counts)) expect(Math.abs(n / runs - 1 / 12)).toBeLessThan(0.012)
  })

  it('puts Task 1 first half the time, and 4 or 5 first a quarter each', () => {
    const first: Record<number, number> = {}
    const runs = 20_000
    for (let i = 0; i < runs; i++) {
      const t = shuffleTasks()[0]
      first[t] = (first[t] ?? 0) + 1
    }
    expect(Object.keys(first).sort()).toEqual(['1', '4', '5'])
    expect(Math.abs(first[1] / runs - 0.5)).toBeLessThan(0.02)
    expect(Math.abs(first[4] / runs - 0.25)).toBeLessThan(0.02)
    expect(Math.abs(first[5] / runs - 0.25)).toBeLessThan(0.02)
  })
})

describe('Stride and session task orders', () => {
  it('puts Task 7 first in Stride, and all 6 orders of 8–10 appear', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 3000; i++) {
      const order = shuffleStrideTasks()
      expect(order[0]).toBe(7)
      seen.add(order.join('-'))
    }
    expect(seen.size).toBe(6)
  })

  it('builds 10-task orders with each app as one block, in the app order, always valid', () => {
    for (let i = 0; i < 2000; i++) {
      const appOrder = i % 2 === 0 ? 'bramble_first' : 'stride_first'
      const order = buildTaskOrder(appOrder)
      expect(validTaskOrder(order), order.join('-')).toBe(true)
      expect(appOrderOf(order)).toBe(appOrder)
      const blockSize = appOrder === 'bramble_first' ? 6 : 4
      expect(order.slice(0, blockSize).every((t) => appOfTask(t) === appOfTask(order[0]))).toBe(true)
    }
  })
})

describe('pickAssignment', () => {
  it('has 20 patterns, each nudging 3 of the 6 screens, crossed with 2 app orders', () => {
    expect(PATTERNS).toHaveLength(20)
    expect(new Set(PATTERNS.map(patternKey)).size).toBe(20)
    for (const p of PATTERNS) expect(p).toHaveLength(3)
    expect(new Set(CELLS.map((c) => cellKey(c.pattern, c.appOrder))).size).toBe(40)
  })

  it('picks a least-used cell', () => {
    const counts = Object.fromEntries(CELLS.map((c) => [cellKey(c.pattern, c.appOrder), 2]))
    counts['U2U4U6S'] = 1
    expect(pickAssignment(counts)).toEqual({ pattern: 'U2U4U6', appOrder: 'stride_first' })
  })

  it('balances cells: over 400 participants each screen is nudged and each app first for exactly half', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 400; i++) {
      const { pattern, appOrder } = pickAssignment(counts)
      const k = cellKey(pattern, appOrder)
      counts[k] = (counts[k] ?? 0) + 1
    }
    expect(Object.values(counts)).toEqual(Array(40).fill(10))
    for (const unit of UNITS) {
      const nudged = Object.entries(counts)
        .filter(([k]) => parsePattern(k).includes(unit))
        .reduce((n, [, c]) => n + c, 0)
      expect(nudged, unit).toBe(200)
    }
    const strideFirst = Object.entries(counts)
      .filter(([k]) => k.endsWith('S'))
      .reduce((n, [, c]) => n + c, 0)
    expect(strideFirst).toBe(200)
  })
})
