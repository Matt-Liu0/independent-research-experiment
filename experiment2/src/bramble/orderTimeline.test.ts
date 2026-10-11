import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initialAppState, type AppState } from './appState'
import { courierProgress, deliveryWindow, minutesAway, nextOrderStep } from './orderTimeline'
import { TIMING, setTimingScale } from '../core/timing'

const tracking = (patch: Partial<AppState>): AppState => ({
  ...initialAppState(),
  order: 'placed',
  orderTrackingStarted: true,
  orderPlacedAt: 0,
  ...patch,
})

describe('order timeline with real timings', () => {
  beforeEach(() => setTimingScale(1))
  afterEach(() => setTimingScale(0))

  it('waits for tracking to start', () => {
    expect(nextOrderStep(tracking({ orderTrackingStarted: false, orderElapsedMs: 60_000 }))).toBeNull()
  })

  it('packs, then sends the order on its way, on schedule', () => {
    expect(nextOrderStep(tracking({ orderElapsedMs: TIMING.orderPacked - 1 }))).toBeNull()
    expect(nextOrderStep(tracking({ orderElapsedMs: TIMING.orderPacked }))).toBe('packed')
    expect(nextOrderStep(tracking({ order: 'packed', orderElapsedMs: TIMING.orderOnTheWay - 1 }))).toBeNull()
    expect(nextOrderStep(tracking({ order: 'packed', orderElapsedMs: TIMING.orderOnTheWay }))).toBe('on_the_way')
  })

  it('delivers only after both order prompts and the minimum time on the way', () => {
    const onTheWay = { order: 'on_the_way' as const, orderOnTheWayAtMs: 15_000 }
    const due = 15_000 + TIMING.orderMinOnTheWay
    expect(nextOrderStep(tracking({ ...onTheWay, orderElapsedMs: due + 60_000 }))).toBeNull()
    expect(nextOrderStep(tracking({ ...onTheWay, orderElapsedMs: due + 60_000, settled: ['bg_during_order'] }))).toBeNull()
    const answered: AppState['settled'] = ['bg_during_order', 'sam_share']
    expect(nextOrderStep(tracking({ ...onTheWay, orderElapsedMs: due - 1, settled: answered }))).toBeNull()
    expect(nextOrderStep(tracking({ ...onTheWay, orderElapsedMs: due, settled: answered }))).toBe('delivered')
  })

  it('moves the courier along while on the way, never quite to the door', () => {
    const at = (ms: number) => tracking({ order: 'on_the_way', orderOnTheWayAtMs: 0, orderElapsedMs: ms })
    expect(courierProgress(at(0))).toBe(0)
    expect(courierProgress(at(TIMING.orderMinOnTheWay / 2))).toBeCloseTo(0.45)
    expect(courierProgress(at(TIMING.orderMinOnTheWay * 3))).toBe(0.9)
    expect(minutesAway(at(0))).toBe(12)
    expect(minutesAway(at(TIMING.orderMinOnTheWay * 3))).toBe(1)
  })
})

describe('deliveryWindow', () => {
  it('starts at least 15 minutes out, on a 5-minute mark', () => {
    const now = new Date(2026, 9, 4, 14, 52).getTime()
    expect(deliveryWindow(now)).toBe('Today, 3:10–3:25 PM')
  })

  it('shows both halves of the day when it crosses noon', () => {
    const now = new Date(2026, 9, 4, 11, 40).getTime()
    expect(deliveryWindow(now)).toBe('Today, 11:55 AM–12:10 PM')
  })
})

describe('pointOnRoute', () => {
  it('starts at the store and ends at home', async () => {
    const { pointOnRoute } = await import('./screens/Orders')
    expect(pointOnRoute(0)).toEqual([30, 120])
    expect(pointOnRoute(1)).toEqual([300, 50])
    const [x] = pointOnRoute(0.5)
    expect(x).toBeGreaterThan(110)
    expect(x).toBeLessThan(262)
  })
})
