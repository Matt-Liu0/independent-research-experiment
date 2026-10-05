import { describe, expect, it } from 'vitest'
import { addressMatches, appReducer, bonusDollars, initialAppState, type AppAction, type AppState } from './appState'

const run = (actions: AppAction[], from: AppState = initialAppState()) => actions.reduce(appReducer, from)

describe('appReducer', () => {
  it('starts with 420 points, the practice address and no flow values', () => {
    const s = initialAppState()
    expect(s.points).toBe(420)
    expect(s.address).toBe('12 Birch Lane, Apt 3')
    expect(Object.values(s.flows).every((v) => v === null)).toBe(true)
  })

  it('applies a preset only the first time a flow is shown', () => {
    let s = run([{ type: 'show', flowId: 'courier_live', preset: 'share' }])
    expect(s.flows.courier_live).toBe('share')
    expect(s.shown).toEqual(['courier_live'])
    s = run([{ type: 'set', flowId: 'courier_live', value: 'dont_share' }, { type: 'show', flowId: 'courier_live', preset: 'share' }], s)
    expect(s.flows.courier_live).toBe('dont_share')
    expect(s.shown).toEqual(['courier_live'])
  })

  it('clears precise location when location is refused', () => {
    const s = run([
      { type: 'show', flowId: 'store_precise', preset: 'exact' },
      { type: 'set', flowId: 'store_location', value: 'dont_allow' },
    ])
    expect(s.flows.store_precise).toBeNull()
  })

  it('clears background-between-orders if background-during-order is turned off later', () => {
    const s = run([
      { type: 'set', flowId: 'bg_during_order', value: 'allow' },
      { type: 'set', flowId: 'bg_between_orders', value: 'keep_on' },
      { type: 'set', flowId: 'bg_during_order', value: 'not_now' },
    ])
    expect(s.flows.bg_between_orders).toBeNull()
  })

  it('records settling once', () => {
    const s = run([
      { type: 'settle', flowId: 'reward_keel' },
      { type: 'settle', flowId: 'reward_keel' },
    ])
    expect(s.settled).toEqual(['reward_keel'])
  })

  it('redeems free delivery once, for 300 points', () => {
    const s = run([{ type: 'redeem' }, { type: 'redeem' }])
    expect(s.points).toBe(120)
    expect(s.deliveryRedeemed).toBe(true)
  })

  it("won't redeem without enough points", () => {
    const s = run([{ type: 'addPoints', amount: -200 }, { type: 'redeem' }])
    expect(s.points).toBe(220)
    expect(s.deliveryRedeemed).toBe(false)
  })

  it('places one order, only with a store and items', () => {
    let s = run([{ type: 'addToCart', productId: 'oat_milk' }, { type: 'placeOrder', at: 1 }])
    expect(s.order).toBe('none')
    s = run([{ type: 'setStore', storeId: 'elm', atMs: 0 }, { type: 'addToCart', productId: 'sourdough' }, { type: 'placeOrder', at: 5000 }], s)
    expect(s.order).toBe('placed')
    expect(s.orderPlacedAt).toBe(5000)
    expect(s.orderItems).toEqual(['oat_milk', 'sourdough'])
    expect(s.cart).toEqual([])
    s = run([{ type: 'addToCart', productId: 'eggs' }, { type: 'placeOrder', at: 9000 }], s)
    expect(s.orderItems).toEqual(['oat_milk', 'sourdough'])
    expect(s.orderPlacedAt).toBe(5000)
  })

  it('only counts tracking time once tracking has started, and steps only forward', () => {
    let s = run([
      { type: 'setStore', storeId: 'elm', atMs: 0 },
      { type: 'addToCart', productId: 'oat_milk' },
      { type: 'placeOrder', at: 0 },
      { type: 'orderTick', ms: 5000 },
    ])
    expect(s.orderElapsedMs).toBe(0)
    s = run([{ type: 'startTracking' }, { type: 'orderTick', ms: 5000 }, { type: 'orderTick', ms: 12000 }], s)
    expect(s.orderElapsedMs).toBe(17000)
    s = run([{ type: 'orderStep', step: 'on_the_way' }], s)
    expect(s.order).toBe('on_the_way')
    expect(s.orderOnTheWayAtMs).toBe(17000)
    s = run([{ type: 'orderStep', step: 'packed' }], s)
    expect(s.order).toBe('on_the_way')
    s = run([{ type: 'orderStep', step: 'delivered' }, { type: 'orderTick', ms: 9999 }], s)
    expect(s.order).toBe('delivered')
    expect(s.orderElapsedMs).toBe(17000)
  })

  it('measures time to find a store from the first visit', () => {
    const s = run([
      { type: 'visitFindStore', atMs: 1000 },
      { type: 'visitFindStore', atMs: 5000 },
      { type: 'zipSearch', storesViewed: 6 },
      { type: 'viewStores', storesViewed: 24 },
      { type: 'setStore', storeId: 'elm', atMs: 41_000 },
      { type: 'setStore', storeId: 'riverside', atMs: 90_000 },
    ])
    expect(s.storeSearch).toEqual({ usedZipSearch: true, storesViewed: 24, firstVisitMs: 1000, msToFind: 40_000 })
  })

  it('toggles saved deals', () => {
    const s = run([
      { type: 'toggleDeal', dealId: 'apples' },
      { type: 'toggleDeal', dealId: 'yogurt' },
      { type: 'toggleDeal', dealId: 'apples' },
    ])
    expect(s.savedDeals).toEqual(['yogurt'])
  })

  it('ignores a blank address and trims a real one', () => {
    let s = run([{ type: 'saveAddress', address: '   ' }])
    expect(s.address).toBe('12 Birch Lane, Apt 3')
    s = run([{ type: 'saveAddress', address: '  40 Oak Street ' }], s)
    expect(s.address).toBe('40 Oak Street')
  })

  it('adds up Account page visits and time', () => {
    const s = run([{ type: 'accountVisit' }, { type: 'accountLeave', ms: 1200.4 }, { type: 'accountVisit' }, { type: 'accountLeave', ms: 800 }])
    expect(s.accountPageVisits).toBe(2)
    expect(s.accountPageMs).toBe(2000)
  })
})

describe('addressMatches', () => {
  it.each(['40 Oak Street', '40 oak street', ' 40  Oak St. ', '40 Oak St', '40 Oak Street,'])('accepts %j', (a) => {
    expect(addressMatches(a)).toBe(true)
  })

  it.each(['40 Oak Avenue', '4 Oak Street', '40 Oak Street Apt 2', '12 Birch Lane, Apt 3', ''])('rejects %j', (a) => {
    expect(addressMatches(a)).toBe(false)
  })
})

describe('bonusDollars', () => {
  it('pays 100 points = $0.10', () => {
    expect(bonusDollars(420)).toBe(0.42)
    expect(bonusDollars(120)).toBe(0.12)
    expect(bonusDollars(570)).toBe(0.57)
  })
})

describe('storableAppState', () => {
  it('never stores a typed address other than the practice one or 40 Oak Street', async () => {
    const { storableAppState, OTHER_ADDRESS, displayAddress } = await import('./appState')
    const s = initialAppState()
    expect(storableAppState(s).address).toBe('12 Birch Lane, Apt 3')
    expect(storableAppState({ ...s, address: '40 oak st.' }).address).toBe('40 Oak Street')
    expect(storableAppState({ ...s, address: '221B Baker Street' }).address).toBe(OTHER_ADDRESS)
    expect(displayAddress(OTHER_ADDRESS)).toBe('Your new address')
  })
})
