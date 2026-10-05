import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'

const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Bramble' })).getByRole('button', { name })

describe('Find a store', () => {
  it('nudged: asks for location with precise preset on, then lists nearby stores', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged')
    await user.click(screen.getByRole('button', { name: 'Find a store' }))

    const sheet = screen.getByRole('dialog', { name: 'Allow Bramble to use your location?' })
    expect(within(sheet).getByRole('switch', { name: 'Precise location' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(sheet).getByRole('button', { name: 'Allow while using Bramble' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Stores near you')).toBeInTheDocument()
    expect(app.state().settled).toEqual(expect.arrayContaining(['store_location', 'store_precise']))
    expect(app.state().flows.store_precise).toBe('exact')

    await user.click(screen.getAllByRole('button', { name: 'Set as my store' })[0])
    expect(app.state().storeId).toBe('elm')
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'store_set', storeId: 'elm', hasOatMilk: true })
  })

  it('neutral: Allow needs an exact/general choice; declining needs nothing', async () => {
    const user = userEvent.setup()
    renderApp('neutral', { screen: 'find_store' })
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('button', { name: 'Allow once' })).toBeDisabled()
    expect(within(sheet).getByRole('button', { name: "Don't allow" })).toBeEnabled()
    await user.click(within(sheet).getByRole('button', { name: 'General area only' }))
    expect(within(sheet).getByRole('button', { name: 'Allow once' })).toBeEnabled()
  })

  it('declining location leads to the ZIP search, never stores the ZIP, and leaves precise location not applicable', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { screen: 'find_store' })
    await user.click(screen.getByRole('button', { name: "Don't allow" }))

    expect(screen.getByText('Location is off. Enter a ZIP code to see stores.')).toBeInTheDocument()
    expect(app.state().flows.store_precise).toBeNull()
    expect(app.state().settled).not.toContain('store_precise')

    await user.type(screen.getByLabelText('ZIP code'), '13346')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByText('24 stores in this ZIP code · A to Z')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Set as my store' })).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Show 18 more' }))
    expect(screen.getAllByRole('button', { name: 'Set as my store' })).toHaveLength(24)

    expect(app.state().storeSearch).toMatchObject({ usedZipSearch: true, storesViewed: 24 })
    expect(JSON.stringify(app.events)).not.toContain('13346')
    expect(JSON.stringify(app.state())).not.toContain('13346')
  })
})

describe('Checkout', () => {
  const ready = { storeId: 'elm', cart: ['oat_milk', 'sourdough'], screen: 'checkout' as const }

  it('neutral: Place order waits for the courier choice; ordering settles both checkout flows', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', ready)
    const place = screen.getByRole('button', { name: /place order/i })
    expect(place).toBeDisabled()
    expect(screen.getByRole('checkbox')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: "Don't share" }))
    await user.click(place)

    expect(app.state().order).not.toBe('none')
    expect(screen.getByText('Order placed! You can follow it in Orders.')).toBeInTheDocument()
    const settled = app.eventsOf('settled')
    expect(settled.map((e) => [e.flowId, e.value])).toEqual([
      ['courier_live', 'dont_share'],
      ['checkout_partner_offers', 'unchecked'],
    ])
  })

  it('nudged: presets sharing and settles the presets if left alone', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', ready)
    expect(screen.getByRole('checkbox')).toBeChecked()
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(app.eventsOf('settled')).toEqual([
      expect.objectContaining({ flowId: 'courier_live', value: 'share', changedFromDefault: false }),
      expect.objectContaining({ flowId: 'checkout_partner_offers', value: 'checked', changedFromDefault: false }),
    ])
  })

  it('shows free delivery after redeeming points', () => {
    renderApp('nudged', { ...ready, deliveryRedeemed: true })
    expect(screen.getByText('Free (points)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place order · $10.48' })).toBeInTheDocument()
  })

  it('asks for a store first when none is set', () => {
    renderApp('nudged', { ...ready, storeId: null })
    expect(screen.getByText('Choose a store before you order.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeDisabled()
  })
})

describe('Orders', () => {
  const onTheWay = { storeId: 'elm', order: 'on_the_way' as const, orderItems: ['oat_milk', 'sourdough'], screen: 'orders' as const }

  it('delivers after both prompts, then asks to keep background location if it was allowed', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', onTheWay)
    expect(screen.getByRole('button', { name: 'Allow in background' })).toHaveClass('btn-green')
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveClass('btn-link')
    await user.click(screen.getByRole('button', { name: 'Allow in background' }))
    await user.click(screen.getByRole('button', { name: 'Send arrival time only' }))

    expect(await screen.findByText('Delivered at 5:44 PM', {}, { timeout: 3000 })).toBeInTheDocument()
    const sheet = screen.getByRole('dialog', { name: 'Keep background location on?' })
    await user.click(within(sheet).getByRole('button', { name: 'Turn it off' }))
    expect(app.state().flows.bg_between_orders).toBe('turn_off')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('skips the keep-on question when background location was declined', async () => {
    const user = userEvent.setup()
    renderApp('neutral', onTheWay)
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    await user.click(screen.getByRole('button', { name: 'Share my live location with Sam' }))
    expect(await screen.findByText('Delivered at 5:44 PM', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Deals', () => {
  it('neutral: hides deals until both settings are chosen, and settles them on leaving', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'deals' })
    expect(screen.getByText("Choose both settings above to see this week's deals.")).toBeInTheDocument()

    const [, offFirst] = within(screen.getByRole('group', { name: 'Deals picked for you' })).getAllByRole('button')
    await user.click(offFirst)
    await user.click(within(screen.getByRole('group', { name: 'Offers from partner brands' })).getByRole('button', { name: 'Off' }))
    await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
    await user.click(screen.getByRole('button', { name: 'Save Greek yogurt, 32 oz' }))
    expect(app.state().savedDeals).toEqual(['apples', 'yogurt'])
    expect(app.eventsOf('settled')).toHaveLength(0)

    await user.click(tab('Rewards'))
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['deals_personalized', 'off'],
      ['deals_partner_offers', 'off'],
    ])
  })

  it('nudged: shows deals straight away with both switches on', () => {
    renderApp('nudged', { screen: 'deals' })
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true'])
    expect(screen.getByRole('button', { name: 'Save Sourdough loaf' })).toBeInTheDocument()
  })
})

describe('Rewards', () => {
  it('redeems free delivery and pays for accepted offers, in both levels', async () => {
    for (const friction of ['nudged', 'neutral'] as const) {
      const user = userEvent.setup()
      const app = renderApp(friction, { screen: 'rewards' })
      await user.click(screen.getByRole('button', { name: 'Redeem' }))
      expect(app.state().points).toBe(120)
      expect(screen.getByRole('button', { name: 'Redeemed' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Donate' }))
      expect(app.state().points).toBe(220)
      expect(screen.getByText('Donating')).toBeInTheDocument()
      expect(screen.getByText('220 pts')).toBeInTheDocument()
      app.unmount()
    }
  })

  it('shows the same point amounts in both levels', () => {
    for (const friction of ['nudged', 'neutral'] as const) {
      const app = renderApp(friction, { screen: 'rewards' })
      expect(screen.getByText('+200 pts')).toBeInTheDocument()
      expect(screen.getByText('+100 pts')).toBeInTheDocument()
      expect(screen.getByText('+150 pts')).toBeInTheDocument()
      app.unmount()
    }
  })
})

describe('Account', () => {
  it('shows unanswered flows as not set, and logs changes as account_page decisions', async () => {
    const user = userEvent.setup()
    const fresh = renderApp('nudged', { screen: 'shop' })
    await user.click(tab('Rewards'))
    await user.click(screen.getByRole('button', { name: 'Link' }))
    await user.click(tab('Account'))

    const keel = screen.getByRole('group', { name: 'Keel Auto Insurance' })
    expect(within(keel).getByRole('button', { name: 'Linked' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Location access' })).getByText('Not set yet')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Precise location' })).getByText('Needs location access on')).toBeInTheDocument()

    await user.click(within(keel).getByRole('button', { name: 'Not linked' }))
    expect(fresh.eventsOf('decision').at(-1)).toMatchObject({ flowId: 'reward_keel', value: 'decline', source: 'account_page' })
    expect(fresh.state().points).toBe(620)
    expect(fresh.state().accountPageVisits).toBe(1)
  })

  it('saves the address but logs only whether it matches', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'account' })
    const input = screen.getByLabelText('Delivery address')
    await user.clear(input)
    await user.type(input, '40 Oak Street')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(app.state().address).toBe('40 Oak Street')
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'address_saved', matches: true })
    expect(JSON.stringify(app.events)).not.toContain('Oak')
  })

  it('records time spent on the Account page when leaving it', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral')
    await user.click(tab('Account'))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    await user.click(tab('Shop'))
    expect(app.state().accountPageVisits).toBe(1)
    expect(app.state().accountPageMs).toBeGreaterThan(0)
  })
})
