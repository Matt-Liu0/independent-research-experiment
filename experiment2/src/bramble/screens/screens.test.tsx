import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { emptyFlowValues } from '../flows'

const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Bramble' })).getByRole('button', { name })

describe('Find a store', () => {
  const openCard = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(within(screen.getByRole('list', { name: 'Stores' })).getByRole('button', { name: new RegExp(`^Bramble Market · ${name}`) }))
    return screen.getByRole('region', { name: `Bramble Market · ${name}` })
  }

  it('nudged: asks for location with precise preset on, then shows a map and nearby stores', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged')
    await user.click(screen.getByRole('button', { name: 'Find a store' }))

    const sheet = screen.getByRole('dialog', { name: 'Allow “Bramble” to use your location?' })
    expect(within(sheet).getByRole('switch', { name: 'Precise' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(sheet).getByRole('button', { name: 'Allow While Using App' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Map of stores near you' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your location')).toBeInTheDocument()
    expect(screen.getByText('Stores near you')).toBeInTheDocument()
    expect(screen.getByText(/0\.3 mi/)).toBeInTheDocument()
    expect(app.state().settled).toEqual(expect.arrayContaining(['store_location', 'store_precise']))
    expect(app.state().flows.store_precise).toBe('exact')
  })

  it('shows stock in the store card, and sets the store from it', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'once', store_precise: 'exact' }, settled: ['store_location', 'store_precise'], shown: ['store_location', 'store_precise'] })
    const cedar = await openCard(user, 'Cedar Plaza')
    expect(within(cedar).getByText('Out of stock')).toBeInTheDocument()

    const elm = await openCard(user, 'Elm Street')
    expect(within(elm).getByText('In stock · Aisle 4')).toBeInTheDocument()
    await user.click(within(elm).getByRole('button', { name: 'Set as my store' }))
    expect(app.state().storeId).toBe('elm')
    expect(within(elm).getByRole('button', { name: 'Your store ✓' })).toBeInTheDocument()
    expect(app.eventsOf('action').map((e) => e.name)).toEqual(['map_shown', 'store_card_opened', 'store_card_opened', 'store_set'])
    // No WebGL in tests, so the drawn map is the one shown.
    expect(app.eventsOf('action')[0]).toMatchObject({ name: 'map_shown', kind: 'drawn' })
  })

  it('opens the same card from a map pin', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'once', store_precise: 'exact' }, settled: ['store_location', 'store_precise'], shown: ['store_location'] })
    await user.click(screen.getByRole('button', { name: 'Bramble Market · Harbor Point on the map' }))
    expect(screen.getByRole('region', { name: 'Bramble Market · Harbor Point' })).toBeInTheDocument()
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'store_card_opened', storeId: 'harbor-point', via: 'pin' })
  })

  it('shows general area as a wide circle with rounded distances', () => {
    renderApp('neutral', { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'while_using', store_precise: 'general' }, settled: ['store_location', 'store_precise'] })
    expect(screen.getByLabelText('Your general area')).toBeInTheDocument()
    expect(screen.queryByLabelText('Your location')).not.toBeInTheDocument()
    expect(screen.getAllByText(/about 1 mi/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/0\.3 mi/)).not.toBeInTheDocument()
  })

  it('searching for oat milk lists only stores that have it, and never logs the typed text', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'once', store_precise: 'exact' }, settled: ['store_location', 'store_precise'] })
    await user.type(screen.getByRole('searchbox', { name: 'Search stores or items' }), 'oat milk please{Enter}')
    expect(screen.getByText('2 stores have oat milk in stock')).toBeInTheDocument()
    expect(screen.getAllByText('Oat milk in stock')).toHaveLength(2)
    expect(app.eventsOf('action').at(-1)).toMatchObject({ name: 'store_search', item: 'oat_milk', results: 2 })
    expect(JSON.stringify(app.events)).not.toContain('please')
  })

  it('neutral: precise location starts off (unchecked), and allowing needs one tap like declining', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'find_store' })
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('switch', { name: 'Precise' })).toHaveAttribute('aria-checked', 'false')
    expect(within(sheet).getByRole('button', { name: 'Allow Once' })).toBeEnabled()
    await user.click(within(sheet).getByRole('button', { name: 'Allow Once' }))
    expect(app.state().flows.store_precise).toBe('general')
    expect(app.eventsOf('settled').find((e) => e.flowId === 'store_precise')).toMatchObject({ value: 'general', defaultShown: 'general', changedFromDefault: false })
  })

  it('declining location leads to the ZIP search with no map, never stores the ZIP, and leaves precise location not applicable', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { screen: 'find_store' })
    await user.click(screen.getByRole('button', { name: "Don't Allow" }))

    expect(screen.getByText('Location is off. Enter a ZIP code to see stores.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Map of stores near you' })).not.toBeInTheDocument()
    expect(app.state().flows.store_precise).toBeNull()
    expect(app.state().settled).not.toContain('store_precise')

    await user.type(screen.getByLabelText('ZIP code'), '13346')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByText('24 stores in this ZIP code · A to Z')).toBeInTheDocument()
    const rows = () => within(screen.getByRole('list', { name: 'Stores' })).getAllByRole('button')
    expect(rows()).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Show 18 more' }))
    expect(rows()).toHaveLength(24)

    const elm = await openCard(user, 'Elm Street')
    await user.click(within(elm).getByRole('button', { name: 'Set as my store' }))
    expect(app.state().storeId).toBe('elm')
    expect(app.state().storeSearch).toMatchObject({ usedZipSearch: true, storesViewed: 24 })
    expect(JSON.stringify(app.events)).not.toContain('13346')
    expect(JSON.stringify(app.state())).not.toContain('13346')
  })

  it('ZIP path: search covers all 24 stores, as on the nearby list', async () => {
    const user = userEvent.setup()
    renderApp('neutral', { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'dont_allow' }, settled: ['store_location'] })
    await user.type(screen.getByLabelText('ZIP code'), '13346')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.type(screen.getByRole('searchbox'), 'oat')
    expect(screen.getByText('3 stores have oat milk in stock')).toBeInTheDocument()
  })
})

describe('Checkout', () => {
  const ready = { storeId: 'elm', cart: ['oat_milk', 'sourdough'], screen: 'checkout' as const }

  it('neutral: courier sharing and the offers box start unchecked; ordering settles both', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', ready)
    const place = screen.getByRole('button', { name: /place order/i })
    expect(place).toBeEnabled()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox', { name: /partner brands based on my delivery address/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Save this card/ })).not.toBeChecked()

    await user.click(place)

    expect(app.state().order).not.toBe('none')
    expect(screen.getByText('Order placed! You can follow it in Orders.')).toBeInTheDocument()
    const settled = app.eventsOf('settled')
    expect(settled.map((e) => [e.flowId, e.value])).toEqual([
      ['courier_live', 'dont_share'],
      ['checkout_partner_offers', 'unchecked'],
      ['save_card', 'unchecked'],
    ])
  })

  it('nudged: presets sharing and settles the presets if left alone', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', ready)
    expect(screen.getByRole('checkbox', { name: /partner brands based on my delivery address/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Save this card/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(app.eventsOf('settled')).toEqual([
      expect.objectContaining({ flowId: 'courier_live', value: 'share', changedFromDefault: false }),
      expect.objectContaining({ flowId: 'checkout_partner_offers', value: 'checked', changedFromDefault: false }),
      expect.objectContaining({ flowId: 'save_card', value: 'checked', changedFromDefault: false }),
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
    expect(screen.getByRole('button', { name: 'Allow' })).toHaveClass('btn-green')
    expect(screen.getByRole('button', { name: "Don't Allow" })).toHaveClass('btn-equal')
    await user.click(screen.getByRole('button', { name: 'Allow' }))
    await user.click(screen.getByRole('button', { name: 'Send arrival time only' }))

    expect(await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })).toBeInTheDocument()
    const sheet = screen.getByRole('dialog', { name: 'Keep background location on?' })
    await user.click(within(sheet).getByRole('button', { name: 'Keep Only While Using' }))
    expect(app.state().flows.bg_between_orders).toBe('turn_off')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('skips the keep-on question when background location was declined', async () => {
    const user = userEvent.setup()
    renderApp('neutral', onTheWay)
    await user.click(screen.getByRole('button', { name: "Don't Allow" }))
    await user.click(screen.getByRole('button', { name: 'Share my live location with Sam' }))
    expect(await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Deals', () => {
  it('neutral: both deal settings start off, deals show right away, and settings settle on leaving', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'deals' })
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false'])
    await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
    await user.click(screen.getByRole('button', { name: 'Save Greek yogurt, 32 oz' }))
    expect(app.state().savedDeals).toEqual(['apples', 'yogurt'])
    expect(app.eventsOf('settled')).toHaveLength(0)

    await user.click(tab('Rewards'))
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['deals_personalized', 'off'],
      ['deals_partner_offers', 'off'],
      ['birthday_deals', 'off'],
    ])
  })

  it('nudged: shows deals straight away with both switches on', () => {
    renderApp('nudged', { screen: 'deals' })
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true'])
    expect(screen.getByRole('button', { name: 'Save Sourdough loaf' })).toBeInTheDocument()
  })
})

describe('Rewards', () => {
  it('redeems free delivery and pays for accepted offers, in both levels', async () => {
    for (const friction of ['nudged', 'neutral'] as const) {
      const user = userEvent.setup()
      const app = renderApp(friction, { screen: 'rewards' })
      await user.click(screen.getByRole('button', { name: 'Redeem' }))
      expect(app.state().points).toBe(50)
      expect(screen.getByRole('button', { name: 'Redeemed' })).toBeDisabled()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[1])
      expect(app.state().points).toBe(150)
      expect(screen.getByText('Accepted · +100 pts')).toBeInTheDocument()
      expect(screen.getByText('150 pts')).toBeInTheDocument()
      app.unmount()
    }
  })

  it('lets an answered offer be changed, with points following the answer', async () => {
    for (const friction of ['nudged', 'neutral'] as const) {
      const user = userEvent.setup()
      const app = renderApp(friction, { screen: 'rewards' })
      const keel = () => screen.getByText('Keel Auto Insurance').closest('.offer-card') as HTMLElement

      await user.click(within(keel()).getByRole('button', { name: 'Accept' }))
      expect(app.state().points).toBe(350)
      expect(within(keel()).getByText('Accepted · +200 pts')).toBeInTheDocument()

      await user.click(within(keel()).getByRole('button', { name: 'Change' }))
      await user.click(within(keel()).getByRole('button', { name: 'Decline' }))
      expect(app.state().points).toBe(150)
      expect(within(keel()).getByText('Declined')).toBeInTheDocument()

      await user.click(within(keel()).getByRole('button', { name: 'Change' }))
      await user.click(within(keel()).getByRole('button', { name: 'Accept' }))
      expect(app.state().points).toBe(350)

      // The first choice stays the measure; the changes are logged as later decisions.
      expect(app.eventsOf('settled')).toEqual([expect.objectContaining({ flowId: 'reward_keel', value: 'accept' })])
      expect(app.eventsOf('decision').map((e) => e.source)).toEqual(['prompt', 'rewards_page', 'rewards_page'])
      expect(app.eventsOf('points').map((e) => [e.amount, e.reason])).toEqual([
        [200, 'offer_accepted'],
        [-200, 'offer_changed'],
        [200, 'offer_changed'],
      ])
      app.unmount()
    }
  })

  it('pays when a declined offer is changed to accepted', async () => {
    const user = userEvent.setup()
    const app = renderApp('neutral', { screen: 'rewards' })
    const uni = () => screen.getByText('University traffic study').closest('.offer-card') as HTMLElement
    await user.click(within(uni()).getByRole('button', { name: 'Decline' }))
    expect(app.state().points).toBe(150)
    await user.click(within(uni()).getByRole('button', { name: 'Change' }))
    await user.click(within(uni()).getByRole('button', { name: 'Accept' }))
    expect(app.state().points).toBe(250)
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
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    await user.click(tab('Account'))

    const keel = screen.getByRole('group', { name: 'Keel Auto Insurance' })
    expect(within(keel).getByRole('button', { name: 'Accepted' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Location' })).getByText('Not set yet')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Precise Location' })).getByText('Needs location on')).toBeInTheDocument()

    await user.click(within(keel).getByRole('button', { name: 'Declined' }))
    expect(fresh.eventsOf('decision').at(-1)).toMatchObject({ flowId: 'reward_keel', value: 'decline', source: 'account_page' })
    // Unlinking takes the points back, so the bonus always matches what is shared.
    expect(fresh.state().points).toBe(150)
    expect(fresh.eventsOf('points').map((e) => e.amount)).toEqual([200, -200])
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
