import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetClock, visibleMs } from './clock'
import { createMemorySink, installVisibilityLogging, logEvent, setEventSink, setLogContext } from './logEvent'

describe('logEvent', () => {
  let sink: ReturnType<typeof createMemorySink>

  beforeEach(() => {
    vi.useFakeTimers()
    resetClock()
    sink = createMemorySink()
    setEventSink(sink)
    setLogContext({ taskId: null, screen: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds clientT and the current task and screen', () => {
    setLogContext({ taskId: 2, screen: 'checkout' })
    vi.advanceTimersByTime(1500)
    logEvent('decision', { flowId: 'courier_live', value: 'share' })
    expect(sink.events).toHaveLength(1)
    expect(sink.events[0]).toMatchObject({
      type: 'decision',
      taskId: 2,
      screen: 'checkout',
      flowId: 'courier_live',
      value: 'share',
    })
    expect(sink.events[0].clientT).toBeGreaterThanOrEqual(1500)
  })

  it('drops undefined fields, which Firestore would reject', () => {
    logEvent('action', { name: 'store_set', storeId: undefined })
    expect('storeId' in sink.events[0]).toBe(false)
  })

  it('keeps logging if the sink throws', () => {
    setEventSink({
      write: () => {
        throw new Error('offline')
      },
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => logEvent('screen')).not.toThrow()
    spy.mockRestore()
  })

  it('logs visibility changes and leaves hidden time out of the visible clock', () => {
    let state: DocumentVisibilityState = 'visible'
    const doc = document
    vi.spyOn(doc, 'visibilityState', 'get').mockImplementation(() => state)
    const uninstall = installVisibilityLogging(doc)

    vi.advanceTimersByTime(1000)
    state = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(30_000)
    state = 'visible'
    doc.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(2000)

    expect(sink.events.map((e) => e.state)).toEqual(['hidden', 'visible'])
    expect(visibleMs()).toBeGreaterThanOrEqual(3000)
    expect(visibleMs()).toBeLessThan(3100)
    uninstall()
  })
})
