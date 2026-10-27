// Loading delays with real timings (fake clock). Other tests run them at zero.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TIMING, setTimingScale } from '../src/core/timing'
import { parseEntry } from '../src/study/prolific'
import { skipSetup } from '../src/study/setup'
import { MemoryStore } from '../src/study/store'
import { StudyApp } from '../src/study/StudyApp'
import { newParticipant } from '../src/study/types'
import { renderApp } from '../src/test/renderApp'

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Bramble' })).getByRole('button', { name })

beforeEach(() => {
  vi.useFakeTimers()
  setTimingScale(1)
})

afterEach(() => {
  vi.useRealTimers()
})

// fireEvent rather than user-event: user-event's own pauses stall under a fake clock.
const click = (el: HTMLElement) => act(() => {
  fireEvent.click(el)
})

describe('screen loading', () => {
  it('shows a skeleton, and prompts appear (and start timing) only after it', async () => {
    const app = renderApp('nudged')
    await click(tab('Rewards'))

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByText('Keel Auto Insurance')).not.toBeInTheDocument()
    expect(app.eventsOf('prompt_shown')).toHaveLength(0)
    const nav = app.eventsOf('screen').at(-1)!
    expect(nav.loadingMs).toBe(TIMING.dataSkeleton)

    await advance(TIMING.dataSkeleton)
    expect(screen.getByText('Keel Auto Insurance')).toBeInTheDocument()
    const shown = app.eventsOf('prompt_shown')
    expect(shown.map((e) => e.flowId)).toEqual(['reward_keel', 'reward_university', 'reward_data_partners'])
    expect(shown[0].clientT as number).toBeGreaterThanOrEqual((nav.clientT as number) + TIMING.dataSkeleton)
  })

  it('uses the shorter skeleton for light screens', async () => {
    renderApp('neutral', { screen: 'deals' })
    await click(tab('Account'))
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    await advance(TIMING.tabSkeleton)
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })
})

describe('action spinners', () => {
  it.each(['Accept', 'Decline'])('shows the same "Saving…" after %s, and logs the choice at the tap', async (button) => {
    const app = renderApp('nudged', { screen: 'rewards' })
    await click(within(screen.getByText('Keel Auto Insurance').closest('.offer-card') as HTMLElement).getByRole('button', { name: button }))

    expect(app.eventsOf('settled')).toHaveLength(1)
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    await advance(TIMING.offerSave - 1)
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    await advance(1)
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument()
  })

  it('fixes the checkout choices at the tap, then places the order after the spinner', async () => {
    const app = renderApp('nudged', { screen: 'checkout', storeId: 'elm', cart: ['oat_milk', 'sourdough'] })
    await click(screen.getByRole('button', { name: /place order/i }))

    expect(app.eventsOf('settled').map((e) => e.flowId)).toEqual(['courier_live', 'checkout_partner_offers', 'save_card'])
    expect(screen.getByText('Placing order…')).toBeInTheDocument()
    expect(app.state().order).toBe('none')

    await advance(TIMING.placeOrder)
    expect(app.state().order).not.toBe('none')
    expect(screen.getByText('Order placed! You can follow it in Orders.')).toBeInTheDocument()
  })

  it('redeems after its spinner', async () => {
    const app = renderApp('neutral', { screen: 'rewards' })
    await click(screen.getByRole('button', { name: 'Redeem' }))
    expect(app.state().points).toBe(150)
    await advance(TIMING.redeem)
    expect(app.state().points).toBe(50)
  })
})

describe('finding stores', () => {
  it.each(['Allow Once', "Don't Allow"])('waits the same time after %s', async (answer) => {
    renderApp('nudged', { screen: 'find_store' })
    await click(screen.getByRole('button', { name: answer }))
    expect(screen.getByText('Finding stores near you…')).toBeInTheDocument()
    await advance(TIMING.findingStores - 1)
    expect(screen.getByText('Finding stores near you…')).toBeInTheDocument()
    await advance(1)
    expect(screen.queryByText('Finding stores near you…')).not.toBeInTheDocument()
  })
})

describe('task splash', () => {
  beforeEach(() => skipSetup())

  it('opens the app from the home screen, with a splash, only after the task card is closed', async () => {
    const existing = {
      ...newParticipant({ prolificPid: 'p', studyId: 's', sessionId: 'x' }),
      stage: 'tasks' as const,
      pattern: 'U1U2U3U4U5U6',
      taskOrder: [5, 1, 2, 4, 6] as (1 | 2 | 4 | 5 | 6)[],
    }
    render(<StudyApp entry={parseEntry('?PROLIFIC_PID=p&STUDY_ID=s&SESSION_ID=x')} store={new MemoryStore({ existing })} />)
    await act(async () => {})

    expect(screen.queryByRole('navigation', { name: 'Bramble' })).not.toBeInTheDocument()
    await click(screen.getByRole('button', { name: 'Start task' }))
    // The phone's home screen first; the app opens from its icon.
    expect(screen.getByText('Tap Bramble to open it')).toBeInTheDocument()
    expect(screen.queryByLabelText('Opening Bramble')).not.toBeInTheDocument()
    await click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.getByLabelText('Opening Bramble')).toBeInTheDocument()
    await advance(TIMING.splash)
    expect(screen.getByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
  })
})

describe('order timeline', () => {
  const placed = { storeId: 'elm', order: 'placed' as const, orderItems: ['oat_milk', 'sourdough'], orderPlacedAt: Date.UTC(2026, 9, 4, 19, 0) }
  const advanceBy = async (ms: number) => {
    // In half-second ticks, as the app's timer runs.
    for (let t = 0; t < ms; t += TIMING.orderTick) await advance(TIMING.orderTick)
  }

  it('starts when Orders opens, and shows the order prompts only once it is on the way', async () => {
    const app = renderApp('nudged', { ...placed, screen: 'shop' })
    await advanceBy(30_000)
    expect(app.state().orderElapsedMs).toBe(0)

    await click(tab('Orders'))
    await advance(TIMING.dataSkeleton)
    expect(screen.getByText("We've got your order.")).toBeInTheDocument()
    expect(app.eventsOf('prompt_shown')).toHaveLength(0)

    await advanceBy(TIMING.orderPacked)
    expect(screen.getByText('Your groceries are packed and waiting for a courier.')).toBeInTheDocument()
    await advanceBy(TIMING.orderOnTheWay - TIMING.orderPacked)
    expect(screen.getByText('Dana picked up your order.')).toBeInTheDocument()
    expect(app.eventsOf('prompt_shown').map((e) => e.flowId)).toEqual(['bg_during_order', 'sam_share'])
    expect(app.eventsOf('action').filter((e) => e.name === 'order_status').map((e) => e.step)).toEqual(['packed', 'on_the_way'])
  })

  it('keeps going on other tabs, and delivers only after both prompts and the minimum time', async () => {
    const app = renderApp('neutral', { ...placed, screen: 'orders', orderTrackingStarted: true, orderElapsedMs: TIMING.orderOnTheWay })
    await advance(TIMING.orderTick)
    expect(app.state().order).toBe('on_the_way')

    await click(screen.getByRole('button', { name: "Don't Allow" }))
    await click(screen.getByRole('button', { name: 'Send arrival time only' }))
    expect(screen.getByText('Arriving soon…')).toBeInTheDocument()
    expect(app.state().order).toBe('on_the_way')

    await click(tab('Deals'))
    await advanceBy(TIMING.orderMinOnTheWay)
    expect(app.state().order).toBe('delivered')
    await click(tab('Orders'))
    await advance(TIMING.dataSkeleton)
    expect(screen.getByRole('heading', { name: /^Delivered at / })).toBeInTheDocument()
  })

  it('never delivers while a prompt is unanswered', async () => {
    const app = renderApp('nudged', { ...placed, screen: 'orders', orderTrackingStarted: true, orderElapsedMs: TIMING.orderOnTheWay })
    await advance(TIMING.orderTick)
    await click(screen.getByRole('button', { name: 'Allow' }))
    await advanceBy(120_000)
    expect(app.state().order).toBe('on_the_way')
  })

  it('shows times from the clock when the order was placed', async () => {
    renderApp('nudged', { ...placed, screen: 'orders', orderTrackingStarted: true })
    const expected = new Date(placed.orderPlacedAt + 20 * 60_000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})
