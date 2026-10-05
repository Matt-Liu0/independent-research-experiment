import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyFlowValues } from '../src/bramble/flows'
import { installBackGuard, setBackHandler } from '../src/study/backGuard'
import { renderApp } from '../src/test/renderApp'

const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Bramble' })).getByRole('button', { name })
const phoneBack = () => act(() => window.dispatchEvent(new PopStateEvent('popstate')))

describe('‹ back button', () => {
  it('returns to the screen you came from', async () => {
    const user = userEvent.setup()
    // Location already answered, so Find a store opens without its prompt.
    const app = renderApp('nudged', {
      cart: ['oat_milk'],
      flows: { ...emptyFlowValues(), store_location: 'dont_allow' },
      settled: ['store_location'],
    })
    await user.click(screen.getByRole('button', { name: /go to checkout/i }))
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Find a store' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(app.state().screen).toBe('checkout')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(app.state().screen).toBe('shop')
    expect(app.eventsOf('screen').map((e) => e.via)).toEqual(['tap', 'tap', 'back', 'back'])
  })

  it('goes to Shop from a sub-screen opened with no history (e.g. after a reload)', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'checkout', storeId: 'elm', cart: ['oat_milk'] })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(app.state().screen).toBe('shop')
  })

  it('is not shown on the tab screens', async () => {
    const user = userEvent.setup()
    renderApp('nudged')
    for (const name of ['Shop', 'Deals', 'Rewards', 'Orders', 'Account']) {
      await user.click(tab(name))
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    }
  })
})

describe("phone's Back", () => {
  let uninstall: () => void
  beforeEach(() => {
    uninstall = installBackGuard()
  })
  afterEach(() => {
    uninstall()
    setBackHandler(null)
  })

  it('moves back between app screens instead of leaving the study', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged')
    await user.click(tab('Deals'))
    await user.click(tab('Rewards'))
    await phoneBack()
    expect(app.state().screen).toBe('deals')
    await phoneBack()
    expect(app.state().screen).toBe('shop')
    expect(app.eventsOf('action').filter((e) => e.name === 'phone_back').map((e) => e.handled)).toEqual([true, true])
  })

  it('does nothing with nowhere to go back to, and keeps the participant on the page', async () => {
    const app = renderApp('nudged')
    const length = window.history.length
    await phoneBack()
    expect(app.state().screen).toBe('shop')
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'phone_back', handled: false })
    // The guard entry is put back, so the next Back is caught too.
    expect(window.history.length).toBeGreaterThan(length)
  })

  it("can't be used to escape a prompt", async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral')
    await user.click(screen.getByRole('button', { name: 'Find a store' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await phoneBack()
    expect(app.state().screen).toBe('find_store')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'phone_back', handled: false })
  })

  it('is blocked outside the app (consent, ratings, surveys)', async () => {
    const app = renderApp('nudged')
    app.unmount()
    await phoneBack()
    expect(app.events.at(-1)).toMatchObject({ type: 'action', name: 'phone_back', handled: false })
  })
})
