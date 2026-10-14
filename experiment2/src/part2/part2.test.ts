import { describe, expect, it } from 'vitest'
import { ALL_FLOWS } from '../allFlows'
import { heldOutDistance } from './distance'
import { ATTENTION_POSITIONS, BATTERY, HELD_OUT_ITEMS, REPEATED_ITEMS, SITE_ITEMS } from './items'
import { MIN_REPEAT_GAP, buildSequence, slotKey, validSequence } from './order'

/** Deterministic random numbers for repeatable tests. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
}

describe('battery', () => {
  it('has every site flow once, 12 held-out flows and 12 repeats (53 scored items)', () => {
    expect(SITE_ITEMS.map((i) => i.id)).toEqual(ALL_FLOWS.map((f) => f.id))
    expect(HELD_OUT_ITEMS).toHaveLength(12)
    expect(REPEATED_ITEMS).toHaveLength(12)
    expect(BATTERY.length + REPEATED_ITEMS.length).toBe(53)
    expect(new Set(BATTERY.map((i) => i.id)).size).toBe(BATTERY.length)
  })

  it('repeats one flow per decision screen in each app, as matched pairs', () => {
    const repeated = REPEATED_ITEMS.map((id) => ALL_FLOWS.find((f) => f.id === id)!)
    for (const app of ['bramble', 'stride'] as const) {
      expect(repeated.filter((f) => f.app === app).map((f) => f.unit).sort()).toEqual(['U1', 'U2', 'U3', 'U4', 'U5', 'U6'])
    }
    for (const f of repeated.filter((r) => r.app === 'stride')) expect(REPEATED_ITEMS).toContain(f.counterpart)
  })

  it('never names Bramble or Stride, and words every reward in dollars', () => {
    for (const item of BATTERY) {
      for (const text of Object.values(item.text)) {
        expect(text, item.id).not.toMatch(/Bramble|Stride|points|coins/)
        const usd = item.ci.transmissionPrinciple.consideration?.usd
        if (usd) expect(text, item.id).toContain(`$${usd.toFixed(2)}`)
        else expect(text, item.id).not.toContain('$')
      }
    }
  })

  it('pairs held-out flows across the two information types, each one or more parameters from every site flow', () => {
    expect(HELD_OUT_ITEMS.filter((i) => i.domain === 'bramble')).toHaveLength(6)
    for (const item of HELD_OUT_ITEMS) {
      const { distance } = heldOutDistance(item.ci, SITE_ITEMS)
      expect(distance, item.id).toBeGreaterThanOrEqual(1)
    }
    expect(heldOutDistance(HELD_OUT_ITEMS[0].ci, SITE_ITEMS)).toMatchObject({ nearest: 'reward_university', distance: 1, differs: ['identifiability'] })
  })
})

describe('order', () => {
  it('builds valid orders: repeats at least 20 apart, attention items in place, a different order each time', () => {
    const random = seeded(7)
    const orders = Array.from({ length: 200 }, () => buildSequence(random))
    for (const slots of orders) {
      expect(validSequence(slots)).toBe(true)
      expect(slots).toHaveLength(55)
      for (const pos of ATTENTION_POSITIONS) expect(slots[pos - 1].kind).toBe('attention')
    }
    expect(new Set(orders.map((o) => o.map(slotKey).join(','))).size).toBe(200)
    // Both wordings come first about equally often.
    const firstWording = (o: ReturnType<typeof buildSequence>) =>
      (o.find((s) => s.kind === 'item' && s.itemId === 'store_location') as { wording: string }).wording
    const aFirst = orders.filter((o) => firstWording(o) === 'A').length
    expect(aFirst).toBeGreaterThan(70)
    expect(aFirst).toBeLessThan(130)
  })

  it('rejects an order with a repeat too close', () => {
    const slots = buildSequence(seeded(3))
    const i = slots.findIndex((s) => s.kind === 'item' && REPEATED_ITEMS.includes(s.itemId))
    const id = (slots[i] as { itemId: string }).itemId
    const j = slots.findIndex((s, k) => k !== i && s.kind === 'item' && s.itemId === id)
    const moved = [...slots]
    const [second] = moved.splice(j, 1)
    // Put the second wording right after the first, keeping the attention items in place.
    const target = moved.findIndex((s, k) => k > i && s.kind === 'item')
    moved.splice(target, 0, second)
    expect(Math.abs(moved.indexOf(second) - i)).toBeLessThan(MIN_REPEAT_GAP)
    expect(validSequence(moved)).toBe(false)
  })
})
